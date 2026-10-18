import type { FastifyInstance } from 'fastify'
import { currentUser } from './authenticate.js'
import {
  credentialsSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  parseBody,
  registerSchema,
  resetPasswordSchema,
} from './schemas.js'
import type { AuthService } from './service.js'
import { parseBearer } from './tokens.js'

// HTTP-маршруты /api/auth/*. Вся логика — в AuthService, здесь только разбор запроса и ответ.

export async function authRoutes(app: FastifyInstance, opts: { service: AuthService; rateLimitPerMinute: number }) {
  const { service } = opts
  // Лимит попыток с одного IP — против подбора паролей.
  const rateLimit = { max: opts.rateLimitPerMinute, timeWindow: '1 minute' }

  app.post('/api/auth/register', { config: { rateLimit } }, async (request, reply) => {
    const input = parseBody(registerSchema, request.body)
    const result = await service.register(input)
    return reply.code(201).send(result)
  })

  app.post('/api/auth/login', { config: { rateLimit } }, async (request) => {
    const credentials = parseBody(credentialsSchema, request.body)
    return service.login(credentials)
  })

  app.get('/api/auth/me', { preHandler: app.authenticate }, async (request) => {
    return { user: currentUser(request) }
  })

  // Ответ одинаковый, есть такой email или нет.
  app.post('/api/auth/password/forgot', { config: { rateLimit } }, async (request, reply) => {
    const { email } = parseBody(forgotPasswordSchema, request.body)
    await service.requestPasswordReset(email)
    return reply.code(204).send()
  })

  app.post('/api/auth/password/reset', { config: { rateLimit } }, async (request) => {
    const { token, password } = parseBody(resetPasswordSchema, request.body)
    return service.resetPassword(token, password)
  })

  app.delete('/api/auth/account', { preHandler: app.authenticate }, async (request, reply) => {
    const { password } = parseBody(deleteAccountSchema, request.body)
    await service.deleteAccount(currentUser(request).id, password)
    return reply.code(204).send()
  })

  // Выход идемпотентный: недействительный или отсутствующий токен — тоже 204.
  app.post('/api/auth/logout', async (request, reply) => {
    const token = parseBearer(request.headers.authorization)
    if (token) await service.logout(token)
    return reply.code(204).send()
  })
}
