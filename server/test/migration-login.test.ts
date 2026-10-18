import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL } from './helpers.js'

// Миграция 004 на «старой» базе: аккаунты с email получают логины, email удаляется.
// Отдельная схема — чтобы не трогать таблицы остальных тестов.

const MIGRATIONS = resolve(import.meta.dirname, '..', 'migrations')
const SCHEMA = 'migration_login_test'

describe('миграция 004: логин вместо email', () => {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  const apply = async (file: string) => client.query(await readFile(join(MIGRATIONS, file), 'utf8'))

  beforeAll(async () => {
    await client.connect()
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

  it('логин — из части до «@», совпадения — с номером, короткие дополняются', async () => {
    const emails = ['anna@mail.ru', 'Anna@gmail.com', 'anna2@ya.ru', 'Ivan.Petrov+run@x.org', 'a@b.c', '__x@y.z']
    for (const [index, email] of emails.entries()) {
      await client.query(
        `INSERT INTO users (email, password_hash, created_at) VALUES ($1, 'h', now() + make_interval(secs => $2))`,
        [email.toLowerCase(), index],
      )
    }
    await apply('004_login_instead_of_email.sql')

    const { rows } = await client.query<{ login: string }>('SELECT login FROM users ORDER BY created_at')
    // anna2 уже занят второй «anna» — третья получает anna22.
    expect(rows.map((row) => row.login)).toEqual(['anna', 'anna2', 'anna22', 'ivan.petrovrun', 'runnera', 'runnerx'])

    const columns = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users'`,
      [SCHEMA],
    )
    expect(columns.rows.map((row) => row.column_name)).not.toContain('email')
    // Уникальность и формат держит сама база.
    await expect(client.query(`INSERT INTO users (login, password_hash) VALUES ('anna', 'h')`)).rejects.toThrow()
    await expect(client.query(`INSERT INTO users (login, password_hash) VALUES ('Anna', 'h')`)).rejects.toThrow()
  })
})
