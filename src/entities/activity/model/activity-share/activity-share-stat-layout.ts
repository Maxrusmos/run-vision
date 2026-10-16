import type { ShareStatKey, ShareStatPosition, ShareStatWidth } from './activity-share.types';

/** Сетка показателей — 6 колонок: треть = 2, половина = 3, вся ширина = 6. */
export const STAT_GRID_COLUMNS = 6;

const STAT_SPAN: Record<ShareStatWidth, number> = {
  third: 2,
  half: 3,
  full: 6,
};

export type StatLayoutItem = {
  key: ShareStatKey;
  width: ShareStatWidth;
};

export type StatLayout = Record<ShareStatKey, ShareStatPosition>;

export function getStatSpan(width: ShareStatWidth): number {
  return STAT_SPAN[width];
}

/** Сколько колонок показывает сетка-подсказка для показателя этой ширины. */
export function getStatGridColumns(width: ShareStatWidth): number {
  return STAT_GRID_COLUMNS / STAT_SPAN[width];
}

/** Привязывает колонку к ближайшей допустимой для ширины показателя (0/2/4, 0/3, 0). */
export function snapStatColumn(col: number, width: ShareStatWidth): number {
  const span = STAT_SPAN[width];
  const maxCol = STAT_GRID_COLUMNS - span;
  return Math.min(maxCol, Math.max(0, Math.floor(col / span) * span));
}

type ResolveOptions = {
  /** Строка, с которой автоматически ставятся показатели без позиции. */
  startRow?: number;
  /** Этот показатель ставится первым и не сдвигается остальными. */
  priorityKey?: ShareStatKey;
};

class OccupancyGrid {
  private readonly cells = new Set<string>();

  isFree(row: number, col: number, span: number): boolean {
    for (let offset = 0; offset < span; offset += 1) {
      if (this.cells.has(`${row}:${col + offset}`)) return false;
    }
    return true;
  }

  occupy(row: number, col: number, span: number) {
    for (let offset = 0; offset < span; offset += 1) {
      this.cells.add(`${row}:${col + offset}`);
    }
  }
}

function findFreeCell(
  grid: OccupancyGrid,
  fromRow: number,
  width: ShareStatWidth,
): ShareStatPosition {
  const span = STAT_SPAN[width];

  // Ищем вниз от строки; сетка растёт, поэтому место всегда найдётся.
  for (let row = Math.max(0, fromRow); ; row += 1) {
    for (let col = 0; col + span <= STAT_GRID_COLUMNS; col += span) {
      if (grid.isFree(row, col, span)) return { row, col };
    }
  }
}

/**
 * Раскладывает показатели по сетке без наложений.
 *
 * Показатели с позицией остаются на месте (сначала priorityKey, затем по порядку строк),
 * при конфликте сдвигаются на ближайшее свободное место ниже. Показатели без позиции
 * встают в первые свободные ячейки, начиная со `startRow`, в порядке списка.
 */
export function resolveStatLayout(
  items: StatLayoutItem[],
  positions: Partial<Record<ShareStatKey, ShareStatPosition>>,
  { startRow = 0, priorityKey }: ResolveOptions = {},
): StatLayout {
  const grid = new OccupancyGrid();
  const layout = {} as StatLayout;

  const placed = items
    .filter((item) => positions[item.key])
    .sort((a, b) => {
      if (a.key === priorityKey) return -1;
      if (b.key === priorityKey) return 1;
      const pa = positions[a.key]!;
      const pb = positions[b.key]!;
      return pa.row - pb.row || pa.col - pb.col;
    });

  const unplaced = items.filter((item) => !positions[item.key]);

  for (const item of placed) {
    const span = STAT_SPAN[item.width];
    const desired = positions[item.key]!;
    const row = Math.max(0, Math.floor(desired.row));
    const col = snapStatColumn(desired.col, item.width);

    const position = grid.isFree(row, col, span)
      ? { row, col }
      : findFreeCell(grid, row, item.width);
    grid.occupy(position.row, position.col, span);
    layout[item.key] = position;
  }

  for (const item of unplaced) {
    const position = findFreeCell(grid, startRow, item.width);
    grid.occupy(position.row, position.col, STAT_SPAN[item.width]);
    layout[item.key] = position;
  }

  return layout;
}

/** Количество строк, занятых раскладкой. */
export function getStatLayoutRows(layout: StatLayout): number {
  return Object.values(layout).reduce((rows, position) => Math.max(rows, position.row + 1), 0);
}
