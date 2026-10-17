import { apiRequest } from '@/shared/api';
import type { AuthCredentials, AuthResponse, User } from '../model/user.types';

export function register(credentials: AuthCredentials): Promise<AuthResponse> {
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

/** Удаляет сессию на сервере. */
export async function logout(token: string): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST', token });
}
