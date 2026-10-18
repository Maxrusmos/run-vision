/** Коды ошибок из контракта (`docs/api.md`) + клиентские `NETWORK` и `UNKNOWN`. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  /** 403 — нужен тариф выше. */
  | 'PLAN_REQUIRED'
  /** 409 — логин уже занят. */
  | 'LOGIN_TAKEN'
  /** 409 — достигнут лимит (например, сохранённых шаблонов). */
  | 'LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INTERNAL'
  /** Сервер не ответил: нет сети, CORS, таймаут. */
  | 'NETWORK'
  /** Ответ не в формате контракта. */
  | 'UNKNOWN';

/** Тело ошибки по контракту. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export const NETWORK_ERROR_MESSAGE = 'Сервер недоступен, попробуйте позже';
export const UNKNOWN_ERROR_MESSAGE = 'Что-то пошло не так, попробуйте ещё раз';

export class ApiError extends Error {
  /** HTTP-статус; 0 — ответа не было (сеть, таймаут). */
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Ошибки по полям формы (для `VALIDATION_ERROR`). */
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
  }

  /** Сервер недоступен — не повод разлогинивать или считать данные неверными. */
  get isNetwork(): boolean {
    return this.code === 'NETWORK';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Собирает `ApiError` из статуса и (возможно, кривого) тела ответа. */
export function parseApiError(status: number, body: unknown): ApiError {
  const error = isRecord(body) ? body.error : undefined;

  if (isRecord(error) && typeof error.code === 'string') {
    const message =
      typeof error.message === 'string' && error.message ? error.message : UNKNOWN_ERROR_MESSAGE;
    const fields: Record<string, string> = {};

    if (isRecord(error.fields)) {
      for (const [key, value] of Object.entries(error.fields)) {
        if (typeof value === 'string') fields[key] = value;
      }
    }

    return new ApiError(status, error.code as ApiErrorCode, message, fields);
  }

  // Ответ не по контракту (прокси, HTML-страница ошибки и т.п.).
  if (status >= 500) return new ApiError(status, 'INTERNAL', UNKNOWN_ERROR_MESSAGE);
  if (status === 401) return new ApiError(status, 'UNAUTHORIZED', 'Требуется вход');
  return new ApiError(status, 'UNKNOWN', UNKNOWN_ERROR_MESSAGE);
}

export function createNetworkError(): ApiError {
  return new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
}
