import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import { normalizeShareCardSettings } from '@/entities/activity/model/activity-share/activity-share-settings';

/**
 * Настройки карточки в том виде, в каком их хранит шаблон: без фото фона и фото точки
 * видео (их не храним)
 * и без своего текста названия (у каждой тренировки своё — берётся из GPX); старые поля
 * переведены в текущие (`normalizeShareCardSettings`) — иначе сравнение видело бы разницу.
 */
export function toTemplateSettings(settings: ShareCardSettings): ShareCardSettings {
  const normalized = normalizeShareCardSettings(settings);
  return JSON.parse(
    JSON.stringify({
      ...normalized,
      backgroundImage: null,
      // Фото точки видео — тоже фото пользователя, в шаблон не попадает.
      videoDot: { ...normalized.videoDot, photo: null },
      title: null,
    }),
  ) as ShareCardSettings;
}

/** JSON с ключами по алфавиту: PostgreSQL (jsonb) возвращает ключи в своём порядке. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Карточка совпадает с сохранённым шаблоном (без учёта фото и текста названия). */
export function isSameTemplateSettings(a: ShareCardSettings, b: ShareCardSettings): boolean {
  return stableStringify(toTemplateSettings(a)) === stableStringify(toTemplateSettings(b));
}
