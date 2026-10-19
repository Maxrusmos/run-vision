import type {
  ShareBackgroundPattern,
  ShareCardSettings,
  ShareTelemetrySettings,
} from './activity-share.types';
import { DEFAULT_VIDEO_DOT } from './video-dot';
import { REMOVED_ROUTE_STYLES } from './activity-share-route-styles';

/**
 * Приводит сохранённые настройки (черновик, шаблон из аккаунта) к текущему виду:
 * поля, которые с тех пор поменялись, переводятся в новые.
 */
export function normalizeShareCardSettings(settings: ShareCardSettings): ShareCardSettings {
  return normalizeRouteStyle(
    normalizeBackgroundPattern(
      normalizeBackgroundDecor(normalizeVideoDot(normalizeRouteFlags(settings))),
    ),
  );
}

/** Убранные стили трека («Пламя», «Закат», «Хром») — на ближайшие оставшиеся. */
function normalizeRouteStyle(settings: ShareCardSettings): ShareCardSettings {
  const replacement = REMOVED_ROUTE_STYLES[settings.routeStyle];
  return replacement ? { ...settings, routeStyle: replacement } : settings;
}

type LegacyTelemetryPattern = { pattern?: ShareBackgroundPattern; grid?: boolean };

/**
 * Узор фона был только у «Телеметрии» (`telemetry.pattern`, а ещё раньше флажок
 * `telemetry.grid`), стал общим — `backgroundPattern`. Без него — без узора.
 */
function normalizeBackgroundPattern(settings: ShareCardSettings): ShareCardSettings {
  const legacy = settings.telemetry as (ShareTelemetrySettings & LegacyTelemetryPattern) | null;
  const hasLegacy = Boolean(legacy && ('pattern' in legacy || 'grid' in legacy));
  if (settings.backgroundPattern !== undefined && !hasLegacy) return settings;

  let pattern: ShareBackgroundPattern = settings.backgroundPattern ?? 'none';
  let telemetry = settings.telemetry;
  if (legacy && hasLegacy) {
    const { pattern: legacyPattern, grid, ...rest } = legacy;
    if (settings.backgroundPattern === undefined) {
      pattern = legacyPattern ?? (grid === false ? 'none' : 'grid');
    }
    telemetry = rest;
  }
  return { ...settings, telemetry, backgroundPattern: pattern };
}

type LegacyRouteFlags = { routeKmMarkers?: boolean; routeStartFinish?: boolean };

/**
 * Флажки были двумя кнопками (`routeKmMarkers`, `routeStartFinish`), стали одной
 * (`routeFlags`): была включена хоть одна — флажки включены.
 */
function normalizeRouteFlags(settings: ShareCardSettings): ShareCardSettings {
  const legacy = settings as ShareCardSettings & LegacyRouteFlags;
  if (legacy.routeKmMarkers === undefined && legacy.routeStartFinish === undefined) {
    return settings;
  }
  const { routeKmMarkers, routeStartFinish, ...rest } = legacy;
  return { ...rest, routeFlags: Boolean(routeKmMarkers || routeStartFinish) };
}

/** Точка видео появилась позже: у старых черновиков и шаблонов — по умолчанию. */
function normalizeVideoDot(settings: ShareCardSettings): ShareCardSettings {
  const dot = settings.videoDot as Partial<ShareCardSettings['videoDot']> | undefined;
  if (dot && Object.keys(DEFAULT_VIDEO_DOT).every((key) => key in dot)) return settings;
  return { ...settings, videoDot: { ...DEFAULT_VIDEO_DOT, ...dot } };
}

/** Фон-оформление (Pro) появилось позже: у старых черновиков и шаблонов — без него. */
function normalizeBackgroundDecor(settings: ShareCardSettings): ShareCardSettings {
  return settings.backgroundDecor === undefined ? { ...settings, backgroundDecor: null } : settings;
}
