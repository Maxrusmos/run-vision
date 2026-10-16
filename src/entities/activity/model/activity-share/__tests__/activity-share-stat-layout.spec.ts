import { describe, expect, it } from 'vitest';
import {
  applyStatDrop,
  getStatDropCells,
  getStatLayoutRows,
  resolveStatLayout,
  snapStatColumn,
  type StatLayoutItem,
} from '../activity-share-stat-layout';

const half = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'half' });
const third = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'third' });
const full = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'full' });

describe('snapStatColumn', () => {
  it('привязывает колонку к сетке ширины показателя', () => {
    expect(snapStatColumn(5, 'third')).toBe(4);
    expect(snapStatColumn(3, 'third')).toBe(4);
    expect(snapStatColumn(1, 'half')).toBe(0);
    expect(snapStatColumn(4, 'half')).toBe(3);
    expect(snapStatColumn(5, 'full')).toBe(0);
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

  it('не ставит в одну строку показатели разной ширины', () => {
    const layout = resolveStatLayout([half('distance'), third('duration'), third('averagePace')], {
      distance: { row: 0, col: 0 },
      duration: { row: 0, col: 4 },
      averagePace: { row: 1, col: 0 },
    });

    expect(layout.distance).toEqual({ row: 0, col: 0 });
    // Треть не встаёт рядом с половиной — уходит ниже, к другой трети.
    expect(layout.duration).toEqual({ row: 1, col: 0 });
    expect(layout.averagePace).toEqual({ row: 1, col: 2 });
  });

  it('показатель, ширину которого сменили, остаётся на месте, соседи другой ширины уходят ниже', () => {
    const layout = resolveStatLayout(
      [third('distance'), half('duration')],
      { distance: { row: 0, col: 0 }, duration: { row: 0, col: 3 } },
      { priorityKey: 'distance' },
    );

    expect(layout.distance).toEqual({ row: 0, col: 0 });
    expect(layout.duration).toEqual({ row: 1, col: 0 });
    expect(getStatLayoutRows(layout)).toBe(2);
  });

  it('выравнивает старые позиции по сетке ширины', () => {
    const layout = resolveStatLayout([third('distance')], { distance: { row: 0, col: 3 } });
    expect(layout.distance).toEqual({ row: 0, col: 4 });
  });
});

describe('getStatDropCells', () => {
  const items = [half('distance'), third('duration'), full('averagePace'), third('maxHeartRate')];
  const layout = resolveStatLayout(items, {
    distance: { row: 0, col: 0 },
    duration: { row: 1, col: 0 },
    averagePace: { row: 2, col: 0 },
    maxHeartRate: { row: 4, col: 0 },
  });

  it('рядом с половиной — место под половину, рядом с третью — под трети', () => {
    const cells = getStatDropCells(items, layout, 'maxHeartRate', 4);

    expect(cells.filter((cell) => cell.row === 0)).toEqual([{ row: 0, col: 3, width: 'half' }]);
    expect(cells.filter((cell) => cell.row === 1)).toEqual([
      { row: 1, col: 2, width: 'third' },
      { row: 1, col: 4, width: 'third' },
    ]);
  });

  it('строка с показателем во всю ширину не размечается', () => {
    const cells = getStatDropCells(items, layout, 'maxHeartRate', 4);
    expect(cells.some((cell) => cell.row === 2)).toBe(false);
  });

  it('пустая строка размечается по ширине перетаскиваемого показателя', () => {
    expect(getStatDropCells(items, layout, 'averagePace', 4).filter((c) => c.row === 3)).toEqual([
      { row: 3, col: 0, width: 'full' },
    ]);
    expect(getStatDropCells(items, layout, 'maxHeartRate', 4).filter((c) => c.row === 3)).toEqual([
      { row: 3, col: 0, width: 'third' },
      { row: 3, col: 2, width: 'third' },
      { row: 3, col: 4, width: 'third' },
    ]);
  });
});

describe('applyStatDrop', () => {
  it('меняет показатели местами и размерами', () => {
    const items = [third('distance'), third('duration'), half('averagePace'), half('maxHeartRate')];
    const layout = resolveStatLayout(items, {
      distance: { row: 0, col: 0 },
      duration: { row: 0, col: 2 },
      averagePace: { row: 1, col: 0 },
      maxHeartRate: { row: 1, col: 3 },
    });

    const result = applyStatDrop(items, layout, 'distance', { kind: 'swap', key: 'maxHeartRate' });

    expect(result.widths.get('distance')).toBe('half');
    expect(result.widths.get('maxHeartRate')).toBe('third');
    expect(result.layout.distance).toEqual({ row: 1, col: 3 });
    expect(result.layout.maxHeartRate).toEqual({ row: 0, col: 0 });
    expect(result.layout.duration).toEqual({ row: 0, col: 2 });
    expect(result.layout.averagePace).toEqual({ row: 1, col: 0 });
  });

  it('в свободное место показатель встаёт с шириной этого места', () => {
    const items = [half('distance'), third('duration')];
    const layout = resolveStatLayout(items, {
      distance: { row: 0, col: 0 },
      duration: { row: 2, col: 0 },
    });

    const result = applyStatDrop(items, layout, 'duration', {
      kind: 'cell',
      row: 0,
      col: 3,
      width: 'half',
    });

    expect(result.widths.get('duration')).toBe('half');
    expect(result.layout.duration).toEqual({ row: 0, col: 3 });
  });
});
