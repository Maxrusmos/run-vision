import { describe, expect, it } from 'vitest';
import type { ShareWidget } from '../activity-share.types';
import { createShareTelemetrySettings, resolveWidgetSide } from '../activity-share-widgets';

const widgets: ShareWidget[] = [
  { kind: 'splits', row: null, side: 'left' },
  { kind: 'zones', row: null, side: 'left' },
  { kind: 'pace', row: null, side: 'right' },
  { kind: 'heartRate', row: 0, side: null },
];

describe('resolveWidgetSide', () => {
  it('в колонку с местом ставит как просили', () => {
    expect(resolveWidgetSide(widgets, 'heartRate', 'right')).toBe('right');
  });

  it('заполненную колонку пропускает — дальше по кругу кнопки', () => {
    expect(resolveWidgetSide(widgets, 'heartRate', 'left')).toBe('right');
    const full = [...widgets, { kind: 'elevation', row: null, side: 'right' } as ShareWidget];
    expect(resolveWidgetSide(full, 'heartRate', 'left')).toBeNull();
    expect(resolveWidgetSide(full, 'heartRate', 'right')).toBeNull();
  });

  it('свой виджет в колонке не считается', () => {
    expect(resolveWidgetSide(widgets, 'zones', 'left')).toBe('left');
  });
});

describe('createShareTelemetrySettings', () => {
  it('сплиты справа, пульс над показателями; без пульса — темп', () => {
    expect(createShareTelemetrySettings(true).widgets).toEqual([
      { kind: 'splits', row: null, side: 'right' },
      { kind: 'heartRate', row: 0, side: null },
    ]);
    expect(createShareTelemetrySettings(false).widgets[1]?.kind).toBe('pace');
  });
});
