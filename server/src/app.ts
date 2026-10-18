import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import type { Config } from './config.js'
import type { Db } from './db.js'
import { ApiError, errors } from './lib/errors.js'
import { createMailer, type Mailer } from './lib/mailer.js'
import { registerAuthenticate } from './modules/auth/authenticate.js'
import { authRoutes } from './modules/auth/routes.js'
import { AuthService } from './modules/auth/service.js'
import { billingRoutes } from './modules/billing/routes.js'
import { createMockProvider } from './modules/billing/provider.js'
import { BillingService } from './modules/billing/service.js'
import { templateRoutes } from './modules/templates/routes.js'
import { TemplatesService } from './modules/templates/service.js'

// Сборка приложения без запуска на порту: так его удобно поднимать в тестах (app.inject).

export interface BuildAppOptions {
  config: Config
  db: Db
  /** false — без логов (тесты). */
  logger?: boolean
  /** Отправка писем; по умолчанию — из конфига (SMTP или лог). В тестах — в память. */
  mailer?: Mailer
}

export async function buildApp({ config, db, logger = true, mailer }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: config.logLevel } : false,
    // За прокси хостинга настоящий IP клиента — в X-Forwarded-For (нужен для лимита попыток).
    // Число — сколько ближайших прокси считать своими.
    trustProxy:
      typeof config.trustProxy === 'number'
        ? (_address: string, hop: number) => hop < (config.trustProxy as number)
        : config.trustProxy,
    bodyLimit: 64 * 1024,
  })

  // JSON-парсер со своими правилами: пустое тело — не ошибка (например, logout без тела),
  // битый JSON — 400 VALIDATION_ERROR в формате контракта.
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8')
    if (text.trim() === '') return done(null, undefined)
    try {
      done(null, JSON.parse(text))
    } catch {
      done(errors.validation(undefined, 'Тело запроса — не корректный JSON'), undefined)
    }
  })

  // Единый обработчик ошибок: любой ответ с ошибкой — в формате { error: { code, message } }.
  app.setErrorHandler((err: FastifyError | ApiError, request, reply) => {
    if (err instanceof ApiError) return reply.code(err.statusCode).send(err.toBody())
    // Ошибки самого Fastify с 4xx (неподдерживаемый Content-Type, слишком большое тело и т.п.).
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return reply.code(400).send(errors.validation(undefined, 'Неверный запрос').toBody())
    }
    // Всё остальное — наша недоработка: подробности в лог, клиенту — общее сообщение.
    request.log.error(err)
    return reply.code(500).send(errors.internal().toBody())
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send(errors.notFound().toBody())
  })

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })

  // global: false — лимит включается только там, где он указан в config маршрута.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => errors.rateLimited(),
  })

  const authService = new AuthService(db, {
    sessionTtlDays: config.sessionTtlDays,
    mailer: mailer ?? createMailer({ smtpUrl: config.smtpUrl, from: config.mailFrom }, (msg) => app.log.info(msg)),
    appUrl: config.appUrl,
    passwordResetTtlMinutes: config.passwordResetTtlMinutes,
    logError: (err) => app.log.error({ err }, 'Письмо не отправлено'),
  })
  registerAuthenticate(app, authService)

  app.get('/api/health', async () => ({ ok: true }))

  await app.register(authRoutes, {
    service: authService,
    rateLimitPerMinute: config.authRateLimitPerMinute,
  })
  await app.register(templateRoutes, { service: new TemplatesService(db) })
  const paymentProvider = config.paymentProvider === 'mock' ? createMockProvider(config.appUrl) : null
  await app.register(billingRoutes, { service: new BillingService(db, paymentProvider, config.appUrl) })

  return app
}
