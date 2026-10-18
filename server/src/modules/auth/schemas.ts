import { z } from 'zod'
import { errors } from '../../lib/errors.js'

// Правила полей — из docs/api.md.

const email = z
  .string({ error: 'Укажите email' })
  .trim()
  .toLowerCase()
  .min(1, 'Укажите email')
  .max(254, 'Email слишком длинный')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Неверный формат email')

// Пробелы по краям пароля не обрезаем — это часть пароля.
const password = z
  .string({ error: 'Укажите пароль' })
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(128, 'Пароль должен быть не длиннее 128 символов')

export const credentialsSchema = z.object({ email, password })

export type Credentials = z.infer<typeof credentialsSchema>

// Согласие на обработку персональных данных — отдельной галочкой, только явное true.
export const registerSchema = credentialsSchema.extend({
  consent: z.literal(true, { error: 'Нужно согласие на обработку персональных данных' }),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  token: z.string({ error: 'Нет токена' }).min(1, 'Нет токена').max(200, 'Неверный токен'),
  password,
})

export const deleteAccountSchema = z.object({
  password: z.string({ error: 'Укажите пароль' }).min(1, 'Укажите пароль').max(128, 'Неверный пароль'),
})

/** Проверить тело запроса схемой; при ошибке — VALIDATION_ERROR с полями. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {})
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in fields)) fields[key] = issue.message
  }
  throw errors.validation(Object.keys(fields).length > 0 ? fields : undefined)
}
