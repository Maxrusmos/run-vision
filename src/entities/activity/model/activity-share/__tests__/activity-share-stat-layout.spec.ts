import { describe, expect, it } from 'vitest';
import {
  getFreeColumnsInRow,
  getStatDropCells,
  getStatLayoutRows,
  resolveStatLayout,
  type StatLayoutItem,
} from '../activity-share-stat-layout';

const half = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'half' });
const third = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'third' });
const full = (key: StatLayoutItem['key']): StatLayoutItem => ({ key, width: 'full' });

const row = (...occupied: number[]) =>
  Array.from({ length: 6 }, (_, col) => occupied.includes(col));

describe('getFreeColumnsInRow', () => {
  it('в пустой строке — обычная сетка: 3 места по трети, 2 по половине, 1 во всю ширину', () => {
    expect(getFreeColumnsInRow(row(), 2)).toEqual([0, 2, 4]);
    expect(getFreeColumnsInRow(row(), 3)).toEqual([0, 3]);
    expect(getFreeColumnsInRow(row(), 6)).toEqual([0]);
  });

  it('рядом с половиной слева помещается одна треть — вплотную к ней', () => {
    expect(getFreeColumnsInRow(row(0, 1, 2), 2)).toEqual([3]);
  });

  it('рядом с половиной справа треть тоже встаёт вплотную', () => {
    expect(getFreeColumnsInRow(row(3, 4, 5), 2)).toEqual([1]);
  });

  it('в занятой строке мест нет', () => {
    expect(getFreeColumnsInRow(row(0, 1, 2, 3, 4, 5), 2)).toEqual([]);
    expect(getFreeColumnsInRow(row(2, 3), 3)).toEqual([]);
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
      [full('distance'), third('duration')],
      { distance: { row: 1, col: 0 }, duration: { row: 1, col: 2 } },
      { priorityKey: 'distance' },
    );

    expect(layout.distance).toEqual({ row: 1, col: 0 });
    expect(layout.duration).toEqual({ row: 2, col: 0 });
    expect(getStatLayoutRows(layout)).toBe(3);
  });

  it('сохраняет треть рядом с половиной (колонка 3)', () => {
    const layout = resolveStatLayout([half('distance'), third('duration')], {
      distance: { row: 0, col: 0 },
      duration: { row: 0, col: 3 },
    });

    expect(layout.duration).toEqual({ row: 0, col: 3 });
  });
});

describe('getStatDropCells', () => {
  it('учитывает выставленные показатели и не рисует места на занятых', () => {
    const items = [half('distance'), full('duration'), third('averagePace')];
    const layout = resolveStatLayout(items, {
      distance: { row: 0, col: 0 },
      duration: { row: 1, col: 0 },
      averagePace: { row: 2, col: 0 },
    });

    expect(getStatDropCells(items, layout, 'averagePace', 3)).toEqual([
      { row: 0, col: 3 },
      { row: 2, col: 0 },
      { row: 2, col: 2 },
      { row: 2, col: 4 },
    ]);
  });
});
