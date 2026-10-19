import { DEFAULT_VIDEO_DOT } from '../video-dot';
import { describe, expect, it } from 'vitest';
import type { ShareCardSettings } from '../activity-share.types';
import { normalizeShareCardSettings } from '../activity-share-settings';
import { createShareTelemetrySettings } from '../activity-share-widgets';

function withTelemetry(telemetry: Record<string, unknown> | null, extra = {}) {
  return {
    title: null,
    telemetry,
    videoDot: { ...DEFAULT_VIDEO_DOT },
    backgroundDecor: null,
    ...extra,
  } as unknown as ShareCardSettings;
}

describe('normalizeShareCardSettings', () => {
  it('старый флажок grid превращается в общий узор фона', () => {
    const base = createShareTelemetrySettings(false);
    const on = normalizeShareCardSettings(withTelemetry({ ...base, grid: true }));
    const off = normalizeShareCardSettings(withTelemetry({ ...base, grid: false }));
    expect(on.backgroundPattern).toBe('grid');
    expect(off.backgroundPattern).toBe('none');
    expect(off.telemetry).toEqual(base);
  });

  it('узор «Телеметрии» переезжает в общий узор фона', () => {
    const base = createShareTelemetrySettings(true);
    const result = normalizeShareCardSettings(withTelemetry({ ...base, pattern: 'radar' }));
    expect(result.backgroundPattern).toBe('radar');
    expect(result.telemetry).toEqual(base);
  });

  it('у старых карточек без «Телеметрии» — без узора', () => {
    expect(normalizeShareCardSettings(withTelemetry(null)).backgroundPattern).toBe('none');
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
    const telemetry = createShareTelemetrySettings(true);
    const card = withTelemetry(telemetry, { backgroundPattern: 'radar' });
    expect(normalizeShareCardSettings(card)).toBe(card);
    const plain = withTelemetry(null, { backgroundPattern: 'none' });
    expect(normalizeShareCardSettings(plain)).toBe(plain);
  });

  it('у старых черновиков без точки видео — точка по умолчанию', () => {
    const old = { title: null, telemetry: null } as unknown as ShareCardSettings;
    expect(normalizeShareCardSettings(old).videoDot).toEqual(DEFAULT_VIDEO_DOT);
  });
});

describe('убранные стили трека', () => {
  it('«Пламя», «Закат», «Хром» переходят на ближайшие', () => {
    const card = (routeStyle: string) =>
      ({ ...withTelemetry(null), routeStyle }) as unknown as ShareCardSettings;
    expect(normalizeShareCardSettings(card('pro-fire')).routeStyle).toBe('pro-plasma');
    expect(normalizeShareCardSettings(card('pro-sunset')).routeStyle).toBe('gradient');
    expect(normalizeShareCardSettings(card('pro-chrome')).routeStyle).toBe('ribbon');
    expect(normalizeShareCardSettings(card('ghost')).routeStyle).toBe('ghost');
  });
});
