// Ошибки API в формате контракта (docs/api.md):
// { "error": { "code": "...", "message": "...", "fields"?: { поле: сообщение } } }

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'PLAN_REQUIRED'
  | 'EMAIL_TAKEN'
  | 'RESET_TOKEN_INVALID'
  | 'PAYMENTS_UNAVAILABLE'
  | 'LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INTERNAL'

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  PLAN_REQUIRED: 403,
  EMAIL_TAKEN: 409,
  RESET_TOKEN_INVALID: 400,
  PAYMENTS_UNAVAILABLE: 503,
  LIMIT_REACHED: 409,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  INTERNAL: 500,
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fields?: Record<string, string>
  }
}

/** Ошибка, которую можно бросить из любого обработчика — error handler превратит её в ответ. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly statusCode: number
  readonly fields?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = STATUS[code]
    this.fields = fields
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    }
  }
}

export const errors = {
  validation: (fields?: Record<string, string>, message = 'Проверьте введённые данные') =>
    new ApiError('VALIDATION_ERROR', message, fields),
  invalidCredentials: () => new ApiError('INVALID_CREDENTIALS', 'Неверный email или пароль'),
  unauthorized: () => new ApiError('UNAUTHORIZED', 'Нужно войти в аккаунт'),
  planRequired: () => new ApiError('PLAN_REQUIRED', 'Доступно только на тарифе Pro'),
  emailTaken: () => new ApiError('EMAIL_TAKEN', 'Этот email уже зарегистрирован'),
  resetTokenInvalid: () =>
    new ApiError(
      'RESET_TOKEN_INVALID',
      'Ссылка для смены пароля недействительна или устарела — запросите новую',
    ),
  limitReached: (message = 'Достигнут лимит сохранённых шаблонов') =>
    new ApiError('LIMIT_REACHED', message),
  paymentsUnavailable: () => new ApiError('PAYMENTS_UNAVAILABLE', 'Оплата пока недоступна'),
  rateLimited: () => new ApiError('RATE_LIMITED', 'Слишком много попыток, попробуйте через минуту'),
  notFound: () => new ApiError('NOT_FOUND', 'Не найдено'),
  internal: () => new ApiError('INTERNAL', 'Внутренняя ошибка сервера, попробуйте позже'),
}
