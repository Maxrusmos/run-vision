import type { ShareCardSettings, ShareColorPreset } from './activity-share.types';
import { findShareDecor } from './activity-share-decor';
import { PRO_COLOR_PRESETS } from './activity-share-presets';

// Что на карточке требует Pro. Без подписки такое оформление можно посмотреть (с водяными
// знаками), но не сохранить. Новые Pro-возможности — сюда же.

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
