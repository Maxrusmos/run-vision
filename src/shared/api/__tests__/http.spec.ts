import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest, configureApiAuth } from '../http';
import { API_URL } from '../config';
import { ApiError, NETWORK_ERROR_MESSAGE, parseApiError } from '../api-error';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Запрос должен был завершиться ошибкой');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  configureApiAuth(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('apiRequest', () => {
  it('шлёт JSON на адрес API и возвращает разобранный ответ', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    const result = await apiRequest('/api/auth/login', { method: 'POST', body: { a: 1 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${API_URL}/api/auth/login`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('подставляет Bearer-токен для auth-запросов и не шлёт его без auth', async () => {
    configureApiAuth({ getToken: () => 'tok', onUnauthorized: vi.fn() });
    fetchMock.mockImplementation(async () => jsonResponse(200, {}));

    await apiRequest('/api/auth/me', { auth: true });
    await apiRequest('/api/health');

    const headers = fetchMock.mock.calls.map(([, init]) => init?.headers as Record<string, string>);
    expect(headers[0]!.Authorization).toBe('Bearer tok');
    expect(headers[1]!.Authorization).toBeUndefined();
  });

  it('204 без тела — undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('разбирает ошибку по контракту: статус, код, сообщение, поля', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте поля',
          fields: { login: 'Нужен логин, а не email', junk: 42 },
        },
      }),
    );

    const error = await catchError(apiRequest('/api/auth/register', { method: 'POST' }));
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Проверьте поля');
    expect(error.fields).toEqual({ login: 'Нужен логин, а не email' });
  });

  it('ответ не по контракту — общая ошибка с понятным текстом', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const error = await catchError(apiRequest('/api/auth/me'));
    expect(error.status).toBe(502);
    expect(error.code).toBe('INTERNAL');
    expect(error.fields).toEqual({});
  });

  it('сетевая ошибка → NETWORK «Сервер недоступен»', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await catchError(apiRequest('/api/health'));
    expect(error.status).toBe(0);
    expect(error.code).toBe('NETWORK');
    expect(error.isNetwork).toBe(true);
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('таймаут обрывает запрос и даёт NETWORK', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const promise = catchError(apiRequest('/api/health', { timeoutMs: 1000 }));
    await vi.advanceTimersByTimeAsync(1000);
    const error = await promise;
    expect(error.code).toBe('NETWORK');
  });

  it('401 UNAUTHORIZED на запрос с токеном вызывает onUnauthorized с этим токеном', async () => {
    const onUnauthorized = vi.fn();
    configureApiAuth({ getToken: () => 'tok', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Нужен вход' } }),
    );

    await catchError(apiRequest('/api/auth/me', { auth: true }));
    expect(onUnauthorized).toHaveBeenCalledWith('tok');
  });

  it('401 INVALID_CREDENTIALS (неверный пароль) не разлогинивает', async () => {
    const onUnauthorized = vi.fn();
    configureApiAuth({ getToken: () => 'tok', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' },
      }),
    );

    const error = await catchError(apiRequest('/api/auth/login', { method: 'POST', auth: true }));
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('parseApiError', () => {
  it('401 без тела считается UNAUTHORIZED', () => {
    expect(parseApiError(401, undefined).code).toBe('UNAUTHORIZED');
  });

  it('пустое сообщение заменяется общим текстом', () => {
    const error = parseApiError(429, { error: { code: 'RATE_LIMITED', message: '' } });
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.message).not.toBe('');
  });
});
