import { describe, expect, it } from 'vitest';
import {
  getStatGridColumns,
  getStatLayoutRows,
  resolveStatLayout,
  snapStatColumn,
  type StatLayoutItem,
} from '../activity-share-stat-layout';

const half = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'half' });

describe('snapStatColumn', () => {
  it('привязывает колонку к сетке ширины показателя', () => {
    expect(snapStatColumn(5, 'third')).toBe(4);
    expect(snapStatColumn(2, 'half')).toBe(0);
    expect(snapStatColumn(4, 'half')).toBe(3);
    expect(snapStatColumn(5, 'full')).toBe(0);
  });
});

describe('getStatGridColumns', () => {
  it('показывает столько колонок, сколько показателей этой ширины влезает в строку', () => {
    expect(getStatGridColumns('third')).toBe(3);
    expect(getStatGridColumns('half')).toBe(2);
    expect(getStatGridColumns('full')).toBe(1);
  });
});

describe('resolveStatLayout', () => {
  it('раскладывает показатели без позиций по порядку, начиная со startRow', () => {
    const layout = resolveStatLayout(
      [half('distance'), half('duration'), half('averagePace')],
      {},
      { startRow: 3 },
    );

    expect(layout).toEqual({
      distance: { row: 3, col: 0 },
      duration: { row: 3, col: 3 },
      averagePace: { row: 4, col: 0 },
    });
  });

  it('оставляет показатель на выбранной позиции и сдвигает конфликтующий', () => {
    const layout = resolveStatLayout(
      [half('distance'), half('duration')],
      { distance: { row: 0, col: 0 }, duration: { row: 0, col: 0 } },
      { priorityKey: 'duration' },
    );

    expect(layout.duration).toEqual({ row: 0, col: 0 });
    expect(layout.distance).toEqual({ row: 0, col: 3 });
  });

  it('не допускает наложений при смене ширины', () => {
    const layout = resolveStatLayout(
      [
        { key: 'distance', width: 'full' },
        { key: 'duration', width: 'third' },
      ],
      { distance: { row: 1, col: 0 }, duration: { row: 1, col: 2 } },
      { priorityKey: 'distance' },
    );

    expect(layout.distance).toEqual({ row: 1, col: 0 });
    expect(layout.duration).toEqual({ row: 2, col: 0 });
    expect(getStatLayoutRows(layout)).toBe(3);
  });

  it('показатели без позиции занимают свободные места рядом с выставленными', () => {
    const layout = resolveStatLayout(
      [half('distance'), half('duration')],
      { distance: { row: 2, col: 0 } },
      { startRow: 2 },
    );

    expect(layout.duration).toEqual({ row: 2, col: 3 });
  });
});
