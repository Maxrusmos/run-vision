import type { ShareCardSettings } from './activity-share.types';
import { normalizeTelemetrySettings } from './activity-share-widgets';

/**
 * Приводит сохранённые настройки (черновик, шаблон из аккаунта) к текущему виду:
 * поля, которые с тех пор поменялись, переводятся в новые.
 */
export function normalizeShareCardSettings(settings: ShareCardSettings): ShareCardSettings {
  return settings.telemetry
    ? { ...settings, telemetry: normalizeTelemetrySettings(settings.telemetry) }
    : settings;
}
