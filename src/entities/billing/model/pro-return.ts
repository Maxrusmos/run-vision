import type { LocationQueryValue } from 'vue-router';
import { getSafeRedirect } from '@/router/redirect';

/**
 * Куда вернуться после покупки Pro (например, в редактор к карточке с Pro-оформлением).
 * Между «Подключить Pro» и возвратом из платёжного сервиса страница уходит на другой
 * сайт — поэтому sessionStorage. Только внутренние пути (`getSafeRedirect`).
 */
const KEY = 'rv.pro.return';

export function rememberProReturn(path: LocationQueryValue | LocationQueryValue[] | undefined) {
  const safe = getSafeRedirect(path);
  try {
    if (safe) sessionStorage.setItem(KEY, safe);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Хранилище недоступно — после оплаты просто не вернём к карточке.
  }
}

/** Путь возврата (и забыть его). */
export function takeProReturn(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return getSafeRedirect(value);
  } catch {
    return null;
  }
}
