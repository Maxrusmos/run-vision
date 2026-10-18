import { z } from 'zod'

// Все настройки сервера — из переменных окружения. Проверяем их один раз на старте:
// лучше сразу упасть с понятной ошибкой, чем получить странное поведение потом.

const DEFAULT_CORS_ORIGINS = 'http://localhost:5173,https://maxrusmos.github.io'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string({ error: 'не задана — укажите строку подключения к PostgreSQL (см. .env.example)' })
    .min(1, 'пустая — укажите строку подключения к PostgreSQL (см. .env.example)'),
  CORS_ORIGINS: z.string().default(DEFAULT_CORS_ORIGINS),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  // true — доверять X-Forwarded-For (сервер за прокси хостинга), число — сколько прокси.
  TRUST_PROXY: z.string().default('false'),
  LOG_LEVEL: z.string().default('info'),
  // Адрес фронта для ссылок в письмах (сброс пароля): …/run-vision/ — дальше #/reset-password.
  APP_URL: z.string().url('APP_URL: ожидается адрес фронта').default('http://localhost:5173/run-vision/'),
  // Почта. Без SMTP_URL письма не отправляются, а пишутся в лог (разработка).
  SMTP_URL: z.string().default(''),
  MAIL_FROM: z.string().default('RunVision <no-reply@localhost>'),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(60),
  // Платёжный сервис: none — оплата выключена (по умолчанию, прод), mock — тестовая оплата
  // без денег (разработка: кнопки «Оплатить / Отменить» на фронте).
  PAYMENT_PROVIDER: z.enum(['none', 'mock'], { error: 'PAYMENT_PROVIDER: none или mock' }).default('none'),
})

export interface Config {
  port: number
  host: string
  databaseUrl: string
  corsOrigins: string[]
  sessionTtlDays: number
  trustProxy: boolean | number
  logLevel: string
  /** Сколько запросов в минуту с одного IP пускать на register/login. */
  authRateLimitPerMinute: number
  /** Адрес фронта (со слэшем на конце) — для ссылок в письмах. */
  appUrl: string
  /** smtp(s)://логин:пароль@хост:порт; пусто — письма в лог. */
  smtpUrl: string
  mailFrom: string
  passwordResetTtlMinutes: number
  paymentProvider: 'none' | 'mock'
}

function parseTrustProxy(value: string): boolean | number {
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === '' || v === 'false' || v === '0' || v === 'no') return false
  const hops = Number(v)
  if (Number.isInteger(hops) && hops > 0) return hops
  throw new Error(`TRUST_PROXY: ожидается true, false или число прокси, получено «${value}»`)
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
    throw new Error(`Неверные переменные окружения:\n${lines.join('\n')}`)
  }
  const e = parsed.data
  return {
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sessionTtlDays: e.SESSION_TTL_DAYS,
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    logLevel: e.LOG_LEVEL,
    authRateLimitPerMinute: 10,
    appUrl: e.APP_URL.endsWith('/') ? e.APP_URL : `${e.APP_URL}/`,
    smtpUrl: e.SMTP_URL.trim(),
    mailFrom: e.MAIL_FROM,
    passwordResetTtlMinutes: e.PASSWORD_RESET_TTL_MINUTES,
    paymentProvider: e.PAYMENT_PROVIDER,
  }
}
