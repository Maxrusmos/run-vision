import { DEFAULT_VIDEO_DOT } from '../video-dot';
import { describe, expect, it } from 'vitest';
import type { ShareCardSettings } from '../activity-share.types';
import { normalizeShareCardSettings } from '../activity-share-settings';
import { createShareTelemetrySettings } from '../activity-share-widgets';

function withTelemetry(telemetry: Record<string, unknown> | null) {
  return {
    title: null,
    telemetry,
    videoDot: { ...DEFAULT_VIDEO_DOT },
  } as unknown as ShareCardSettings;
}

describe('normalizeShareCardSettings', () => {
  it('старый флажок grid превращается в узор', () => {
    const { pattern: _pattern, ...base } = createShareTelemetrySettings(false);
    const on = normalizeShareCardSettings(withTelemetry({ ...base, grid: true }));
    const off = normalizeShareCardSettings(withTelemetry({ ...base, grid: false }));
    expect(on.telemetry?.pattern).toBe('grid');
    expect(off.telemetry?.pattern).toBe('none');
    expect(off.telemetry).not.toHaveProperty('grid');
  });

  it('две старые кнопки флажков становятся одной', () => {
    const legacy = (km: boolean, startFinish: boolean) =>
      ({
        title: null,
        telemetry: null,
        routeFlags: true,
        routeKmMarkers: km,
        routeStartFinish: startFinish,
      }) as unknown as ShareCardSettings;
    expect(normalizeShareCardSettings(legacy(false, false)).routeFlags).toBe(false);
    expect(normalizeShareCardSettings(legacy(true, false)).routeFlags).toBe(true);
    expect(normalizeShareCardSettings(legacy(false, true)).routeFlags).toBe(true);
    expect(normalizeShareCardSettings(legacy(true, true))).not.toHaveProperty('routeKmMarkers');
    expect(normalizeShareCardSettings(legacy(true, true))).not.toHaveProperty('routeStartFinish');
  });

  it('новые настройки и карточки без «Телеметрии» не меняются', () => {
    const telemetry = { ...createShareTelemetrySettings(true), pattern: 'radar' };
    expect(normalizeShareCardSettings(withTelemetry(telemetry)).telemetry).toEqual(telemetry);
    const plain = withTelemetry(null);
    expect(normalizeShareCardSettings(plain)).toBe(plain);
  });

  it('у старых черновиков без точки видео — точка по умолчанию', () => {
    const old = { title: null, telemetry: null } as unknown as ShareCardSettings;
    expect(normalizeShareCardSettings(old).videoDot).toEqual(DEFAULT_VIDEO_DOT);
  });
});
