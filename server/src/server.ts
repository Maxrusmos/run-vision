import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createPool } from './db.js'

// Точка входа: читаем настройки, подключаемся к БД и слушаем порт.

let config
try {
  config = loadConfig()
} catch (err) {
  console.error((err as Error).message)
  process.exit(1)
}

const db = createPool(config.databaseUrl)
const app = await buildApp({ config, db })

// Аккуратная остановка: дождаться текущих запросов и закрыть соединения с БД.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`Получен ${signal}, останавливаемся`)
    await app.close()
    await db.end()
    process.exit(0)
  })
}

try {
  await app.listen({ port: config.port, host: config.host })
} catch (err) {
  app.log.error(err)
  await db.end()
  process.exit(1)
}
