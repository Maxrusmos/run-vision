import type { ShareCardSettings } from './activity-share.types';
import { normalizeTelemetrySettings } from './activity-share-widgets';
import { DEFAULT_VIDEO_DOT } from './video-dot';

/**
 * Приводит сохранённые настройки (черновик, шаблон из аккаунта) к текущему виду:
 * поля, которые с тех пор поменялись, переводятся в новые.
 */
export function normalizeShareCardSettings(settings: ShareCardSettings): ShareCardSettings {
  const withFlags = normalizeBackgroundDecor(normalizeVideoDot(normalizeRouteFlags(settings)));
  return withFlags.telemetry
    ? { ...withFlags, telemetry: normalizeTelemetrySettings(withFlags.telemetry) }
    : withFlags;
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
