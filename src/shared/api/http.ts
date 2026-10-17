import { API_TIMEOUT_MS, API_URL } from './config';
import { ApiError, createNetworkError, parseApiError } from './api-error';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  /** Тело запроса — сериализуется в JSON. */
  body?: unknown;
  /** Отправить токен текущего пользователя (`Authorization: Bearer`). */
  auth?: boolean;
  /** Явный токен (перекрывает текущий) — например, для выхода. */
  token?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface AuthHooks {
  /** Текущий токен пользователя. */
  getToken: () => string | null;
  /** Сервер ответил 401 UNAUTHORIZED на запрос с этим токеном. */
  onUnauthorized: (token: string) => void;
}

let authHooks: AuthHooks | null = null;

/** Подключает учёт токена (делает стор авторизации — так http не зависит от Pinia). */
export function configureApiAuth(hooks: AuthHooks | null) {
  authHooks = hooks;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Запрос к API: JSON туда и обратно, Bearer-токен, таймаут.
 * Любая неудача — `ApiError` (сеть и таймаут — с кодом `NETWORK`).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, timeoutMs = API_TIMEOUT_MS, signal } = options;
  const token = options.token !== undefined ? options.token : auth ? authHooks?.getToken() : null;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromOutside = () => controller.abort();
  signal?.addEventListener('abort', abortFromOutside);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // Отмена снаружи — пробрасываем как есть, вызывающему она не ошибка.
    if (signal?.aborted) throw error;
    throw createNetworkError();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromOutside);
  }

  let data: unknown;
  try {
    data = await readBody(response);
  } catch {
    // Соединение оборвалось на чтении тела.
    throw createNetworkError();
  }

  if (!response.ok) {
    const error = parseApiError(response.status, data);
    if (token && error.status === 401 && error.code === 'UNAUTHORIZED') {
      authHooks?.onUnauthorized(token);
    }
    throw error;
  }

  return data as T;
}
