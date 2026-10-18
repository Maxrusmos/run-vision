import type { FastifyInstance } from 'fastify'
import { currentUser } from '../auth/authenticate.js'
import { parseBody } from '../auth/schemas.js'
import { errors } from '../../lib/errors.js'
import { checkoutSchema, mockCompleteSchema, paymentIdSchema } from './schemas.js'
import type { BillingService } from './service.js'

// HTTP-маршруты /api/billing/*. Логика — в BillingService.

function parsePaymentId(params: unknown): string {
  const result = paymentIdSchema.safeParse((params as { id?: unknown }).id)
  if (!result.success) throw errors.notFound()
  return result.data
}

export async function billingRoutes(app: FastifyInstance, opts: { service: BillingService }) {
  const { service } = opts

  app.get('/api/billing/plans', async () => ({ plans: service.plans(), provider: service.providerId }))

  app.post('/api/billing/checkout', { preHandler: app.authenticate }, async (request, reply) => {
    const { period } = parseBody(checkoutSchema, request.body)
    const result = await service.checkout(currentUser(request).id, period)
    return reply.code(201).send(result)
  })

  app.get('/api/billing/payments/:id', { preHandler: app.authenticate }, async (request) => {
    const payment = await service.getPayment(currentUser(request).id, parsePaymentId(request.params))
    return { payment }
  })

  // Только тестовый сервис: кнопки «Оплатить» / «Отменить» вместо вебхука. На проде
  // (PAYMENT_PROVIDER не mock) маршрута нет вовсе — «купить» Pro без денег нельзя.
  if (service.providerId === 'mock') {
    app.post('/api/billing/mock/payments/:id/complete', { preHandler: app.authenticate }, async (request) => {
      const { result } = parseBody(mockCompleteSchema, request.body)
      return service.completeMockPayment(currentUser(request).id, parsePaymentId(request.params), result)
    })
  }
}
