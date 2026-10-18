import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { configureApiAuth, isApiError } from '@/shared/api';
import { readStorage, writeStorage } from '@/shared/lib/storage/safe-storage';
import {
  authApi,
  normalizeLogin,
  type AccessLevel,
  type AuthCredentials,
  type AuthResponse,
  type User,
} from '@/entities/user';

export const AUTH_TOKEN_STORAGE_KEY = 'rv.auth.token';

/**
 * - `idle` — init ещё не вызывали;
 * - `loading` — проверяем сохранённый токен;
 * - `ready` — знаем, кто пользователь (или что это гость);
 * - `offline` — токен есть, но сервер не ответил: пользователь пока неизвестен,
 *   токен сохраняем и попробуем снова при следующем init.
 */
export type AuthStatus = 'idle' | 'loading' | 'ready' | 'offline';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readStorage(AUTH_TOKEN_STORAGE_KEY));
  const user = shallowRef<User | null>(null);
  const status = ref<AuthStatus>('idle');

  const isAuthenticated = computed(() => user.value !== null);
  const accessLevel = computed<AccessLevel>(() => user.value?.plan ?? 'guest');

  function setToken(value: string | null) {
    token.value = value;
    writeStorage(AUTH_TOKEN_STORAGE_KEY, value);
  }

  function setSession(response: AuthResponse) {
    setToken(response.token);
    user.value = response.user;
    status.value = 'ready';
  }

  /** Забыть сессию локально (без запроса к серверу). */
  function clearSession() {
    setToken(null);
    user.value = null;
    status.value = 'ready';
  }

  // Любой 401 UNAUTHORIZED на запрос с текущим токеном — сессия больше не действует.
  // Ответ на запрос со старым токеном (пришёл после нового входа) новую сессию не трогает.
  configureApiAuth({
    getToken: () => token.value,
    onUnauthorized: (rejected) => {
      if (rejected === token.value) clearSession();
    },
  });

  let initPromise: Promise<void> | null = null;

  /** Проверить сохранённый токен. Не бросает; повторный вызов во время проверки ждёт её. */
  function init(): Promise<void> {
    initPromise ??= runInit().finally(() => {
      initPromise = null;
    });
    return initPromise;
  }

  async function runInit() {
    const savedToken = token.value;
    if (!savedToken) {
      status.value = 'ready';
      return;
    }

    status.value = 'loading';
    try {
      const me = await authApi.fetchMe(savedToken);
      // Пока ждали ответа, могли войти заново или выйти.
      if (token.value !== savedToken) return;
      user.value = me;
      status.value = 'ready';
    } catch (error) {
      if (token.value !== savedToken) return;
      if (isApiError(error) && error.status === 401) {
        // Токен истёк или отозван — тихо забываем (обработчик 401 уже мог это сделать).
        clearSession();
        return;
      }
      // Плохая сеть или сбой сервера — из аккаунта не выкидываем.
      user.value = null;
      status.value = 'offline';
    }
  }

  async function login(credentials: AuthCredentials) {
    const response = await authApi.login({
      login: normalizeLogin(credentials.login),
      password: credentials.password,
    });
    setSession(response);
    return response.user;
  }

  async function register(credentials: AuthCredentials) {
    const response = await authApi.register({
      login: normalizeLogin(credentials.login),
      password: credentials.password,
    });
    setSession(response);
    return response.user;
  }

  /** Выход: локально — всегда, сервер — по возможности. */
  async function logout() {
    const currentToken = token.value;
    clearSession();
    if (!currentToken) return;

    try {
      await authApi.logout(currentToken);
    } catch (error) {
      // Сессия на сервере доживёт свой срок — локально мы уже вышли.
      if (!isApiError(error)) console.warn('Не удалось завершить сессию на сервере', error);
    }
  }

  return {
    token,
    user,
    status,
    isAuthenticated,
    accessLevel,
    init,
    login,
    register,
    logout,
  };
});
