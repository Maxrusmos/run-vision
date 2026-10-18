import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { AUTH_TOKEN_STORAGE_KEY, useAuthStore } from '../auth.store';
import { apiRequest, configureApiAuth } from '@/shared/api';
import type { User } from '@/entities/user';

const fetchMock = vi.fn<typeof fetch>();

const USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'runner@example.com',
  plan: 'free',
  planExpiresAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unauthorized = () =>
  jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Нужен вход' } });

function lastAuthorization() {
  const init = fetchMock.mock.lastCall?.[1];
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setActivePinia(createPinia());
});

afterEach(() => {
  configureApiAuth(null);
  vi.unstubAllGlobals();
});

describe('auth.store', () => {
  it('init без токена — гость, к серверу не ходит', async () => {
    const store = useAuthStore();
    await store.init();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.status).toBe('ready');
    expect(store.accessLevel).toBe('guest');
  });

  it('init с токеном загружает пользователя', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'tok');
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { ...USER, plan: 'pro' } }));

    const store = useAuthStore();
    await store.init();

    expect(lastAuthorization()).toBe('Bearer tok');
    expect(store.user?.email).toBe(USER.email);
    expect(store.isAuthenticated).toBe(true);
    expect(store.accessLevel).toBe('pro');
  });

  it('init с 401 тихо стирает токен', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'expired');
    fetchMock.mockResolvedValue(unauthorized());

    const store = useAuthStore();
    await store.init();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.status).toBe('ready');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('init при недоступном сервере токен не стирает', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'tok');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const store = useAuthStore();
    await store.init();

    expect(store.token).toBe('tok');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('tok');
    expect(store.user).toBeNull();
    expect(store.status).toBe('offline');
  });

  it('init при 500 токен не стирает', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'tok');
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: 'INTERNAL', message: 'x' } }));

    const store = useAuthStore();
    await store.init();

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('tok');
    expect(store.status).toBe('offline');
  });

  it('login сохраняет токен и пользователя, email нормализует', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { token: 'new', user: USER }));

    const store = useAuthStore();
    await store.login({ email: '  Runner@Example.com ', password: ' secret pass ' });

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toEqual({ email: 'runner@example.com', password: ' secret pass ' });
    expect(store.token).toBe('new');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('new');
    expect(store.accessLevel).toBe('free');
  });

  it('неудачный login не меняет состояние и пробрасывает ошибку', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Неверный email' } }),
    );

    const store = useAuthStore();
    await expect(store.login({ email: 'a@b.c', password: '12345678' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(store.token).toBeNull();
  });

  it('logout чистит сессию, даже если сервер не ответил', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { token: 'tok', user: USER }));
    const store = useAuthStore();
    await store.register({ email: USER.email, password: '12345678', consent: true });

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await store.logout();

    expect(lastAuthorization()).toBe('Bearer tok');
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.accessLevel).toBe('guest');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('любой 401 UNAUTHORIZED на запрос с текущим токеном разлогинивает', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { token: 'tok', user: USER }));
    const store = useAuthStore();
    await store.login({ email: USER.email, password: '12345678' });

    fetchMock.mockResolvedValueOnce(unauthorized());
    await expect(apiRequest('/api/anything', { auth: true })).rejects.toBeTruthy();

    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
  });

  it('401 на запрос со старым токеном не трогает новую сессию', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { token: 'new', user: USER }));
    const store = useAuthStore();
    await store.login({ email: USER.email, password: '12345678' });

    fetchMock.mockResolvedValueOnce(unauthorized());
    await expect(apiRequest('/api/anything', { token: 'old' })).rejects.toBeTruthy();

    expect(store.token).toBe('new');
    expect(store.isAuthenticated).toBe(true);
  });

  it('недоступный localStorage не ломает стор', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    fetchMock.mockResolvedValue(jsonResponse(200, { token: 'tok', user: USER }));

    const store = useAuthStore();
    await store.login({ email: USER.email, password: '12345678' });
    expect(store.isAuthenticated).toBe(true);

    vi.restoreAllMocks();
  });

  it('register отправляет согласие', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { token: 'tok', user: USER }));
    const store = useAuthStore();
    await store.register({ email: ' Runner@Example.com ', password: '12345678', consent: true });

    const body = JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body));
    expect(body).toEqual({ email: 'runner@example.com', password: '12345678', consent: true });
  });

  it('forgot нормализует почту; reset входит с новой сессией', async () => {
    const store = useAuthStore();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await store.requestPasswordReset('  Runner@Example.com ');
    expect(JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body))).toEqual({
      email: 'runner@example.com',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { token: 'fresh', user: USER }));
    await store.resetPassword('link-token', 'new password');
    expect(JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body))).toEqual({
      token: 'link-token',
      password: 'new password',
    });
    expect(store.token).toBe('fresh');
    expect(store.isAuthenticated).toBe(true);
  });

  it('deleteAccount: успех — как выход; неверный пароль — сессия остаётся', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { token: 'tok', user: USER }));
    const store = useAuthStore();
    await store.login({ email: USER.email, password: '12345678' });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Неверный пароль' } }),
    );
    await expect(store.deleteAccount('wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(store.isAuthenticated).toBe(true);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await store.deleteAccount('12345678');
    expect(fetchMock.mock.lastCall?.[1]?.method).toBe('DELETE');
    expect(lastAuthorization()).toBe('Bearer tok');
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
