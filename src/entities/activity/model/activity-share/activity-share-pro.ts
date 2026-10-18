import type { ShareCardSettings, ShareColorPreset } from './activity-share.types';
import { findShareDecor } from './activity-share-decor';
import { PRO_COLOR_PRESETS } from './activity-share-presets';
import { PRO_ROUTE_STYLES, type ShareRouteStyleOption } from './activity-share-route-styles';

// Что на карточке требует Pro. Без подписки такое можно посмотреть (с водяными знаками),
// но не сохранить. Новые Pro-возможности — сюда же (и в `FEATURES`).

/** Видно ли фон-оформление: под фото, прозрачным фоном и картой во весь фон его нет. */
export function isDecorVisible(settings: ShareCardSettings): boolean {
  return (
    Boolean(findShareDecor(settings.backgroundDecor)) &&
    !settings.backgroundImage &&
    !settings.transparentBackground &&
    settings.map?.layout !== 'full'
  );
}

/** Pro-оформление на карточке (его пресет) или null. Невидимый фон — не в счёт. */
export function getProDesignInUse(settings: ShareCardSettings): ShareColorPreset | null {
  if (!isDecorVisible(settings)) return null;
  return PRO_COLOR_PRESETS.find((preset) => preset.decor === settings.backgroundDecor) ?? null;
}

/** Pro-стиль трека на карточке или null (трека нет — не в счёт). */
export function getProRouteStyleInUse(settings: ShareCardSettings): ShareRouteStyleOption | null {
  if (!settings.routeVisible) return null;
  return PRO_ROUTE_STYLES.find((style) => style.id === settings.routeStyle) ?? null;
}

export type ProItemInUse =
  { feature: 'proDesigns'; name: string } | { feature: 'proRouteStyles'; name: string };

/** Все Pro-возможности на карточке — для водяных знаков и запрета сохранения. */
export function getProItemsInUse(settings: ShareCardSettings): ProItemInUse[] {
  const items: ProItemInUse[] = [];
  const design = getProDesignInUse(settings);
  if (design) items.push({ feature: 'proDesigns', name: design.name });
  const route = getProRouteStyleInUse(settings);
  if (route) items.push({ feature: 'proRouteStyles', name: route.name });
  return items;
}
