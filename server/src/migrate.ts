import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadConfig } from './config.js'
import { createPool, withTransaction, type Db } from './db.js'

// Миграции: файлы server/migrations/NNN_название.sql применяются по порядку, каждый —
// в своей транзакции. Применённые записываются в таблицу schema_migrations, поэтому
// повторный запуск ничего не делает. Уже применённый файл не меняем — пишем новый.

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

// Произвольное число для pg_advisory_lock: два одновременных запуска не применят миграцию дважды.
const LOCK_ID = 727_001

export async function runMigrations(db: Db, log: (msg: string) => void = () => {}): Promise<string[]> {
  const client = await db.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.name))
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    const done: string[] = []
    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
      await withTransaction(db, async (tx) => {
        await tx.query(sql)
        await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      })
      log(`Применена миграция ${file}`)
      done.push(file)
    }
    return done
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    client.release()
  }
}

// Запуск из командной строки: npm run migrate
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig()
  const db = createPool(config.databaseUrl)
  try {
    const done = await runMigrations(db, console.log)
    console.log(done.length ? `Готово, применено миграций: ${done.length}` : 'Новых миграций нет')
  } catch (err) {
    console.error('Миграция не удалась:', (err as Error).message)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}
