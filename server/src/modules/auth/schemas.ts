import { z } from 'zod'
import { errors } from '../../lib/errors.js'

// Правила полей — из docs/api.md.

// Логин: без учёта регистра (храним в нижнем), латиница, цифры и «_ . -».
const login = z
  .string({ error: 'Укажите логин' })
  .trim()
  .toLowerCase()
  .min(1, 'Укажите логин')
  .min(3, 'Логин должен быть не короче 3 символов')
  .max(32, 'Логин должен быть не длиннее 32 символов')
  .regex(/^[a-z0-9._-]+$/, 'Только латинские буквы, цифры и символы _ . -')
  .regex(/^[a-z0-9]/, 'Логин должен начинаться с буквы или цифры')

// Пробелы по краям пароля не обрезаем — это часть пароля.
const password = z
  .string({ error: 'Укажите пароль' })
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(128, 'Пароль должен быть не длиннее 128 символов')

export const credentialsSchema = z.object({ login, password })

export type Credentials = z.infer<typeof credentialsSchema>

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
