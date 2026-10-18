import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL } from './helpers.js'

// Миграция 005 на двух «старых» базах: обычной (email на месте) и той, где успела пройти
// отменённая 004 (вместо email — login). Отдельная схема — чтобы не трогать остальные тесты.

const MIGRATIONS = resolve(import.meta.dirname, '..', 'migrations')
const SCHEMA = 'migration_005_test'

describe('миграция 005', () => {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  const apply = async (file: string) => client.query(await readFile(join(MIGRATIONS, file), 'utf8'))

  beforeAll(async () => {
    await client.connect()
  })

  beforeEach(async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA}`)
    await client.query(`SET search_path TO ${SCHEMA}`)
    for (const file of ['001_users_sessions.sql', '002_templates.sql', '003_template_share_type.sql']) {
      await apply(file)
    }
  })

  afterAll(async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`)
    await client.end()
  })

  const columns = async () =>
    (
      await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users'`,
        [SCHEMA],
      )
    ).rows.map((row) => row.column_name)

  it('обычная база: email не трогается, появляются согласие и ссылки сброса', async () => {
    await client.query(`INSERT INTO users (email, password_hash) VALUES ('anna@mail.ru', 'h')`)
    await apply('005_consent_password_reset.sql')
    const { rows } = await client.query('SELECT email, consent_at FROM users')
    expect(rows).toEqual([{ email: 'anna@mail.ru', consent_at: null }])
    expect(await columns()).toEqual(expect.arrayContaining(['email', 'consent_at', 'consent_version']))
    await client.query('SELECT 1 FROM password_resets')
  })

  it('база после отменённой 004: email возвращается заглушкой из логина, login удалён', async () => {
    await client.query(`INSERT INTO users (email, password_hash) VALUES ('anna@mail.ru', 'h')`)
    // То, что делала 004: логин вместо email.
    await client.query(`ALTER TABLE users ADD COLUMN login text; UPDATE users SET login = 'anna';
      ALTER TABLE users DROP COLUMN email`)
    await apply('005_consent_password_reset.sql')
    const { rows } = await client.query('SELECT email FROM users')
    expect(rows).toEqual([{ email: 'anna@restored.invalid' }])
    expect(await columns()).not.toContain('login')
    await expect(
      client.query(`INSERT INTO users (email, password_hash) VALUES ('anna@restored.invalid', 'h')`),
    ).rejects.toThrow()
  })
})
