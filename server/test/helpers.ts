import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig, type Config } from '../src/config.js'
import { createPool, type Db } from '../src/db.js'
import { runMigrations } from '../src/migrate.js'

// Тесты ходят в настоящую PostgreSQL, в отдельную тестовую базу: её таблицы очищаются.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://runvision:runvision@localhost:5432/runvision_test'

export function testConfig(overrides: Partial<Config> = {}): Config {
  return { ...loadConfig({ DATABASE_URL: TEST_DATABASE_URL }), ...overrides }
}

/** Подключает БД и миграции на файл, чистит таблицы и пересоздаёт приложение перед каждым тестом. */
export function useTestApp(overrides: Partial<Config> = {}) {
  const ctx = {} as { db: Db; app: FastifyInstance }

  beforeAll(async () => {
    ctx.db = createPool(TEST_DATABASE_URL)
    await runMigrations(ctx.db)
  })

  beforeEach(async () => {
    await ctx.db.query('TRUNCATE users, sessions, templates CASCADE')
    await ctx.app?.close()
    ctx.app = await buildApp({ config: testConfig(overrides), db: ctx.db, logger: false })
  })

  afterAll(async () => {
    await ctx.app?.close()
    await ctx.db.end()
  })

  return ctx
}
