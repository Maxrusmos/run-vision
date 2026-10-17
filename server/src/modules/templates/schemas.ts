import { z } from 'zod'

// Правила полей — из docs/api.md («Сохранённые шаблоны»).

/** Сериализованные настройки — не больше 32 КБ. */
export const MAX_SETTINGS_BYTES = 32 * 1024
/** Шаблонов на пользователя — не больше. */
export const MAX_TEMPLATES_PER_USER = 100

export const PHOTO_TEMPLATE_IDS = ['minimal', 'topographic', 'telemetry'] as const
export type PhotoTemplateId = (typeof PHOTO_TEMPLATE_IDS)[number]

const name = z
  .string({ error: 'Укажите название' })
  .trim()
  .min(1, 'Укажите название')
  .max(60, 'Название не длиннее 60 символов')

const settings = z
  .record(z.string(), z.unknown(), { error: 'Настройки должны быть объектом' })
  .refine(
    (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_SETTINGS_BYTES,
    'Настройки слишком большие',
  )
  // Фото фона в шаблонах не храним — даже если клиент прислал ссылку.
  .transform((value) => ({ ...value, backgroundImage: null }))

const baseTemplate = z.enum(PHOTO_TEMPLATE_IDS, { error: 'Неизвестный шаблон' })

export const createTemplateSchema = z.object({ name, baseTemplate, settings })

export const updateTemplateSchema = z
  .object({ name: name.optional(), settings: settings.optional() })
  .refine((value) => value.name !== undefined || value.settings !== undefined, {
    message: 'Нечего изменять',
    path: ['name'],
  })

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
