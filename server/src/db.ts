import pg from 'pg'

// Пул подключений к PostgreSQL. Запросы — только параметризованные ($1, $2 …),
// значения от пользователя никогда не склеиваются со строкой SQL.

export type Db = pg.Pool

export function createPool(databaseUrl: string): Db {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })
  // Ошибка «простаивающего» соединения (например, БД перезапустилась) не должна ронять процесс.
  pool.on('error', (err) => {
    console.error('Ошибка соединения с PostgreSQL:', err.message)
  })
  return pool
}

/** Выполнить fn в транзакции: COMMIT при успехе, ROLLBACK при ошибке. */
export async function withTransaction<T>(db: Db, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
