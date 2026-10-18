import type { PoolClient } from 'pg'
import { withTransaction, type Db } from '../../db.js'
import { errors } from '../../lib/errors.js'
import { getDummyHash, hashPassword, verifyPassword } from './password.js'
import { generateToken, hashToken } from './tokens.js'
import type { Credentials } from './schemas.js'

// Бизнес-логика авторизации: регистрация, вход, проверка токена, выход.
// Здесь нет ничего про HTTP — только БД и правила. Маршруты — в routes.ts.

export type Plan = 'free' | 'pro'

/** Пользователь в том виде, в каком его отдаёт API (см. User в docs/api.md). */
export interface PublicUser {
  id: string
  login: string
  plan: Plan
  planExpiresAt: string | null
  createdAt: string
}

export interface AuthResult {
  token: string
  user: PublicUser
}

interface UserRow {
  id: string
  login: string
  password_hash: string
  plan: Plan
  plan_expires_at: Date | null
  created_at: Date
}

/**
 * Действующий тариф: 'pro' только пока подписка не истекла
 * (plan_expires_at = null — бессрочно).
 */
export function effectivePlan(plan: Plan, expiresAt: Date | null, now = new Date()): Plan {
  if (plan !== 'pro') return 'free'
  return expiresAt === null || expiresAt > now ? 'pro' : 'free'
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    login: row.login,
    plan: effectivePlan(row.plan, row.plan_expires_at),
    planExpiresAt: row.plan_expires_at ? row.plan_expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }
}

const USER_COLUMNS = 'u.id, u.login, u.password_hash, u.plan, u.plan_expires_at, u.created_at'

const PG_UNIQUE_VIOLATION = '23505'

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly sessionTtlDays: number,
  ) {}

  /** Создать сессию и вернуть сам токен (в БД — только его хэш). */
  private async createSession(client: Db | PoolClient, userId: string): Promise<string> {
    const token = generateToken()
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(days => $3))`,
      [userId, hashToken(token), this.sessionTtlDays],
    )
    return token
  }

  async register({ login, password }: Credentials): Promise<AuthResult> {
    const passwordHash = await hashPassword(password)
    try {
      return await withTransaction(this.db, async (client) => {
        const { rows } = await client.query<UserRow>(
          `INSERT INTO users AS u (login, password_hash) VALUES ($1, $2) RETURNING ${USER_COLUMNS}`,
          [login, passwordHash],
        )
        const user = rows[0]!
        const token = await this.createSession(client, user.id)
        return { token, user: toPublicUser(user) }
      })
    } catch (err) {
      // Два одновременных запроса с одним логином: второй упрётся в UNIQUE — это не 500, а LOGIN_TAKEN.
      if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) throw errors.loginTaken()
      throw err
    }
  }

  async login({ login, password }: Credentials): Promise<AuthResult> {
    const { rows } = await this.db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users u WHERE u.login = $1`, [login])
    const user = rows[0]
    // Хэш считаем всегда, даже если пользователя нет, — чтобы время ответа не выдавало,
    // занят ли логин.
    const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()))
    if (!user || !ok) throw errors.invalidCredentials()

    // Заодно убираем просроченные сессии этого пользователя.
    await this.db.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()', [user.id])
    const token = await this.createSession(this.db, user.id)
    return { token, user: toPublicUser(user) }
  }

  /** Найти пользователя по токену; null — если токен неизвестен или сессия истекла. */
  async findByToken(token: string): Promise<{ user: PublicUser; sessionId: string } | null> {
    const { rows } = await this.db.query<UserRow & { session_id: string }>(
      `SELECT ${USER_COLUMNS}, s.id AS session_id
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    )
    const row = rows[0]
    return row ? { user: toPublicUser(row), sessionId: row.session_id } : null
  }

  /** Удалить сессию по токену. Неизвестный токен — не ошибка. */
  async logout(token: string): Promise<void> {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
  }
}
