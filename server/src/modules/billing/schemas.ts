import { z } from 'zod'

export const checkoutSchema = z.object({
  period: z.enum(['month', 'year'], { error: 'Выберите период: месяц или год' }),
})

export const mockCompleteSchema = z.object({
  result: z.enum(['succeeded', 'canceled'], { error: 'result: succeeded или canceled' }),
})

export const paymentIdSchema = z.uuid({ error: 'Неверный id платежа' })
