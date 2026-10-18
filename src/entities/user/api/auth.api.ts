import { apiRequest } from '@/shared/api';
import type { AuthCredentials, AuthResponse, User } from '../model/user.types';

/** Регистрация — только с согласием на обработку персональных данных (`consent: true`). */
export function register(credentials: AuthCredentials & { consent: true }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', { method: 'POST', body: credentials });
}

export function login(credentials: AuthCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: credentials });
}

/** Текущий пользователь по токену. Токен можно передать явно (иначе — текущий). */
export async function fetchMe(token?: string): Promise<User> {
  const { user } = await apiRequest<{ user: User }>('/api/auth/me', {
    auth: true,
    token,
  });
  return user;
}

/** «Забыли пароль»: ответ одинаковый, есть такой аккаунт или нет. */
export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<void>('/api/auth/password/forgot', { method: 'POST', body: { email } });
}

/** Новый пароль по ссылке из письма — сразу входит. */
export function resetPassword(token: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/password/reset', {
    method: 'POST',
    body: { token, password },
  });
}

/** Удалить аккаунт (подтверждение паролем). */
export async function deleteAccount(password: string): Promise<void> {
  await apiRequest<void>('/api/auth/account', { method: 'DELETE', auth: true, body: { password } });
}

/** Удаляет сессию на сервере. */
export async function logout(token: string): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST', token });
}
