import type { PoolClient } from 'pg'
import { withTransaction, type Db } from '../../db.js'
import { errors } from '../../lib/errors.js'
import { getDummyHash, hashPassword, verifyPassword } from './password.js'
import { generateToken, hashToken } from './tokens.js'
import type { Mailer } from '../../lib/mailer.js'
import { buildPasswordResetMail } from './mails.js'
import type { Credentials, RegisterInput } from './schemas.js'

// Бизнес-логика авторизации: регистрация, вход, проверка токена, выход.
// Здесь нет ничего про HTTP — только БД и правила. Маршруты — в routes.ts.

export type Plan = 'free' | 'pro'

/** Пользователь в том виде, в каком его отдаёт API (см. User в docs/api.md). */
export interface PublicUser {
  id: string
  email: string
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
  email: string
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
    email: row.email,
    plan: effectivePlan(row.plan, row.plan_expires_at),
    planExpiresAt: row.plan_expires_at ? row.plan_expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }
}

const USER_COLUMNS = 'u.id, u.email, u.password_hash, u.plan, u.plan_expires_at, u.created_at'

const PG_UNIQUE_VIOLATION = '23505'

/**
 * Версия текста согласия на обработку персональных данных (страница фронта `#/consent`).
 * Меняется вместе с текстом — так видно, на какую редакцию согласился пользователь.
 */
export const CONSENT_VERSION = '2026-10-18'

export interface AuthServiceOptions {
  sessionTtlDays: number
  mailer: Mailer
  /** Адрес фронта со слэшем на конце — ссылка сброса `${appUrl}#/reset-password?token=…`. */
  appUrl: string
  passwordResetTtlMinutes: number
  /** Ошибка отправки письма — в лог (пользователю ответ одинаковый). */
  logError: (err: unknown) => void
}

export class AuthService {
  private readonly sessionTtlDays: number

  constructor(
    private readonly db: Db,
    private readonly options: AuthServiceOptions,
  ) {
    this.sessionTtlDays = options.sessionTtlDays
  }

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

  async register({ email, password }: RegisterInput): Promise<AuthResult> {
    const passwordHash = await hashPassword(password)
    try {
      return await withTransaction(this.db, async (client) => {
        const { rows } = await client.query<UserRow>(
          `INSERT INTO users AS u (email, password_hash, consent_at, consent_version)
           VALUES ($1, $2, now(), $3) RETURNING ${USER_COLUMNS}`,
          [email, passwordHash, CONSENT_VERSION],
        )
        const user = rows[0]!
        const token = await this.createSession(client, user.id)
        return { token, user: toPublicUser(user) }
      })
    } catch (err) {
      // Два одновременных запроса с одним email: второй упрётся в UNIQUE — это не 500, а EMAIL_TAKEN.
      if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) throw errors.emailTaken()
      throw err
    }
  }

  async login({ email, password }: Credentials): Promise<AuthResult> {
    const { rows } = await this.db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users u WHERE u.email = $1`, [email])
    const user = rows[0]
    // Хэш считаем всегда, даже если пользователя нет, — чтобы время ответа не выдавало,
    // зарегистрирован ли email.
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

  /**
   * «Забыли пароль»: если аккаунт есть — новая одноразовая ссылка (прежние отменяются) и
   * письмо. Есть аккаунт или нет, снаружи не видно: ответ одинаковый, письмо уходит без
   * ожидания (время ответа тоже не выдаёт).
   */
  async requestPasswordReset(email: string): Promise<void> {
    const { rows } = await this.db.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email])
    const user = rows[0]
    if (!user) return

    const token = generateToken()
    await withTransaction(this.db, async (client) => {
      await client.query('DELETE FROM password_resets WHERE user_id = $1', [user.id])
      await client.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [user.id, hashToken(token), this.options.passwordResetTtlMinutes],
      )
    })
    const link = `${this.options.appUrl}#/reset-password?token=${encodeURIComponent(token)}`
    const mail = buildPasswordResetMail(link, this.options.passwordResetTtlMinutes)
    void this.options.mailer.send({ to: email, ...mail }).catch(this.options.logError)
  }

  /**
   * Новый пароль по ссылке из письма: ссылка гаснет, все прежние сессии закрываются
   * (если пароль увели — злоумышленник выйдет), выдаётся новая сессия.
   */
  async resetPassword(token: string, password: string): Promise<AuthResult> {
    const passwordHash = await hashPassword(password)
    return withTransaction(this.db, async (client) => {
      // FOR UPDATE: две одновременные попытки с одной ссылкой — сработает только первая.
      const { rows } = await client.query<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM password_resets
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
          FOR UPDATE`,
        [hashToken(token)],
      )
      const reset = rows[0]
      if (!reset) throw errors.resetTokenInvalid()

      await client.query('UPDATE password_resets SET used_at = now() WHERE id = $1', [reset.id])
      await client.query('DELETE FROM password_resets WHERE user_id = $1 AND id <> $2', [reset.user_id, reset.id])
      const updated = await client.query<UserRow>(
        `UPDATE users AS u SET password_hash = $2 WHERE u.id = $1 RETURNING ${USER_COLUMNS}`,
        [reset.user_id, passwordHash],
      )
      await client.query('DELETE FROM sessions WHERE user_id = $1', [reset.user_id])
      const sessionToken = await this.createSession(client, reset.user_id)
      return { token: sessionToken, user: toPublicUser(updated.rows[0]!) }
    })
  }

  /** Удалить аккаунт (с подтверждением паролем): сессии, шаблоны и ссылки — каскадом. */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const { rows } = await this.db.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    )
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) throw errors.invalidCredentials()
    await this.db.query('DELETE FROM users WHERE id = $1', [userId])
  }

  /** Удалить сессию по токену. Неизвестный токен — не ошибка. */
  async logout(token: string): Promise<void> {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
  }
}
