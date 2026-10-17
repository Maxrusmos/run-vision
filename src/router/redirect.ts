import type { LocationQueryValue } from 'vue-router';

const AUTH_PATHS = ['/login', '/register'];

/**
 * Куда вернуться после входа: только внутренний путь приложения (`/share`), не чужой сайт
 * (`//evil.com`, `https://…`) и не сама страница входа. Иначе — null.
 */
export function getSafeRedirect(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;

  const path = raw.split(/[?#]/)[0] ?? '';
  if (AUTH_PATHS.includes(path)) return null;

  return raw;
}
