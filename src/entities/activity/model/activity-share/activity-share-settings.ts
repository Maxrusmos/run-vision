import type { ShareCardSettings } from './activity-share.types';
import { normalizeTelemetrySettings } from './activity-share-widgets';

/**
 * Приводит сохранённые настройки (черновик, шаблон из аккаунта) к текущему виду:
 * поля, которые с тех пор поменялись, переводятся в новые.
 */
export function normalizeShareCardSettings(settings: ShareCardSettings): ShareCardSettings {
  const withFlags = normalizeRouteFlags(settings);
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
