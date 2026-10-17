import { createHash, randomBytes } from 'node:crypto'

// Токен сессии — случайные 32 байта (base64url). Клиент получает сам токен,
// в БД кладём только его SHA-256: утечка базы не даёт войти от чужого имени.

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Достать токен из заголовка «Authorization: Bearer <token>»; null — если его нет или формат не тот. */
export function parseBearer(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header)
  return match?.[1] ?? null
}
