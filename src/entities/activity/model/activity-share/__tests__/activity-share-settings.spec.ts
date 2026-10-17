import { describe, expect, it } from 'vitest';
import type { ShareCardSettings } from '../activity-share.types';
import { normalizeShareCardSettings } from '../activity-share-settings';
import { createShareTelemetrySettings } from '../activity-share-widgets';

function withTelemetry(telemetry: Record<string, unknown> | null) {
  return { title: null, telemetry } as unknown as ShareCardSettings;
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

  it('новые настройки и карточки без «Телеметрии» не меняются', () => {
    const telemetry = { ...createShareTelemetrySettings(true), pattern: 'radar' };
    expect(normalizeShareCardSettings(withTelemetry(telemetry)).telemetry).toEqual(telemetry);
    const plain = withTelemetry(null);
    expect(normalizeShareCardSettings(plain)).toBe(plain);
  });
});
