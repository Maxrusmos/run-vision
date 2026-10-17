import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import { errors } from '../../lib/errors.js'
import type { AuthService, Plan, PublicUser } from './service.js'
import { parseBearer } from './tokens.js'

// Хуки для закрытых эндпоинтов:
//
//   app.get('/api/что-то', { preHandler: app.authenticate }, async (request) => {
//     request.user  // пользователь, точно не null
//   })
//
//   app.get('/api/pro-фича', { preHandler: [app.authenticate, requirePlan('pro')] }, ...)

declare module 'fastify' {
  interface FastifyRequest {
    /** Текущий пользователь — заполняет хук authenticate. */
    user: PublicUser | null
    /** id текущей сессии — заполняет хук authenticate. */
    sessionId: string | null
  }
  interface FastifyInstance {
    /** preHandler: пускает только с действующим токеном, иначе 401 UNAUTHORIZED. */
    authenticate: preHandlerAsyncHookHandler
  }
}

/**
 * Подключить к приложению request.user и хук app.authenticate. Вызывается в корне
 * приложения (не внутри плагина), чтобы хук был виден всем модулям.
 */
export function registerAuthenticate(app: FastifyInstance, service: AuthService): void {
  app.decorateRequest('user', null)
  app.decorateRequest('sessionId', null)
  app.decorate('authenticate', async function (request: FastifyRequest) {
    const token = parseBearer(request.headers.authorization)
    const found = token ? await service.findByToken(token) : null
    if (!found) throw errors.unauthorized()
    request.user = found.user
    request.sessionId = found.sessionId
  })
}

/** Достать пользователя из request после authenticate (для удобства типов). */
export function currentUser(request: FastifyRequest): PublicUser {
  if (!request.user) throw errors.unauthorized()
  return request.user
}

const PLAN_LEVEL: Record<Plan, number> = { free: 0, pro: 1 }

/**
 * preHandler: требует тариф не ниже указанного (ставить после authenticate).
 * Иначе 403 PLAN_REQUIRED. Пока ни один эндпоинт его не использует — задел под подписку.
 */
export function requirePlan(plan: Plan): preHandlerAsyncHookHandler {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const user = currentUser(request)
    if (PLAN_LEVEL[user.plan] < PLAN_LEVEL[plan]) throw errors.planRequired()
  }
}
