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

/** Занятость ячеек сетки: строка → 6 флагов. */
class OccupancyGrid {
  private readonly rows = new Map<number, boolean[]>();

  getRow(row: number): boolean[] {
    let cells = this.rows.get(row);
    if (!cells) {
      cells = Array.from({ length: STAT_GRID_COLUMNS }, () => false);
      this.rows.set(row, cells);
    }
    return cells;
  }

  isFree(row: number, col: number, span: number): boolean {
    const cells = this.getRow(row);
    return (
      col >= 0 && col + span <= STAT_GRID_COLUMNS && cells.slice(col, col + span).every((c) => !c)
    );
  }

  occupy(row: number, col: number, span: number) {
    this.getRow(row).fill(true, col, col + span);
  }
}

/**
 * Свободные места для показателя ширины `span` в строке.
 *
 * В каждом свободном промежутке помещаем столько мест, сколько влезает.
 * Промежуток у левого края, ограниченный показателем справа, заполняем с правой
 * стороны — чтобы новое место стояло вплотную к уже выставленному показателю.
 */
export function getFreeColumnsInRow(occupied: boolean[], span: number): number[] {
  const columns: number[] = [];
  let col = 0;

  while (col < STAT_GRID_COLUMNS) {
    if (occupied[col]) {
      col += 1;
      continue;
    }

    const start = col;
    while (col < STAT_GRID_COLUMNS && !occupied[col]) col += 1;
    const end = col;

    const count = Math.floor((end - start) / span);
    if (!count) continue;

    const alignRight = start === 0 && end < STAT_GRID_COLUMNS;
    const first = alignRight ? end - count * span : start;
    for (let index = 0; index < count; index += 1) {
      columns.push(first + index * span);
    }
  }

  return columns;
}

function occupyLayout(
  grid: OccupancyGrid,
  items: StatLayoutItem[],
  layout: Partial<StatLayout>,
  excludeKey?: ShareStatKey,
) {
  for (const item of items) {
    const position = layout[item.key];
    if (position && item.key !== excludeKey) {
      grid.occupy(position.row, position.col, STAT_SPAN[item.width]);
    }
  }
}

function findFreeCell(grid: OccupancyGrid, fromRow: number, span: number): ShareStatPosition {
  // Ищем вниз от строки; сетка растёт, поэтому место всегда найдётся.
  for (let row = Math.max(0, fromRow); ; row += 1) {
    const [col] = getFreeColumnsInRow(grid.getRow(row), span);
    if (col !== undefined) return { row, col };
  }
}

type ResolveOptions = {
  /** Строка, с которой автоматически ставятся показатели без позиции. */
  startRow?: number;
  /** Этот показатель ставится первым и не сдвигается остальными. */
  priorityKey?: ShareStatKey;
};

/**
 * Раскладывает показатели по сетке без наложений.
 *
 * Показатели с позицией остаются на месте (сначала priorityKey, затем по порядку строк),
 * при конфликте сдвигаются на ближайшее свободное место ниже. Показатели без позиции
 * встают в первые свободные места, начиная со `startRow`, в порядке списка.
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

  for (const item of placed) {
    const span = STAT_SPAN[item.width];
    const desired = positions[item.key]!;
    const row = Math.max(0, Math.floor(desired.row));
    const col = Math.min(STAT_GRID_COLUMNS - span, Math.max(0, Math.floor(desired.col)));

    const position = grid.isFree(row, col, span) ? { row, col } : findFreeCell(grid, row, span);
    grid.occupy(position.row, position.col, span);
    layout[item.key] = position;
  }

  for (const item of items.filter((entry) => !positions[entry.key])) {
    const span = STAT_SPAN[item.width];
    const position = findFreeCell(grid, startRow, span);
    grid.occupy(position.row, position.col, span);
    layout[item.key] = position;
  }

  return layout;
}

/** Количество строк, занятых раскладкой. */
export function getStatLayoutRows(layout: StatLayout): number {
  return Object.values(layout).reduce((rows, position) => Math.max(rows, position.row + 1), 0);
}

/**
 * Места, куда можно поставить перетаскиваемый показатель: свободные ячейки
 * с учётом уже выставленных показателей (сам перетаскиваемый не учитывается).
 */
export function getStatDropCells(
  items: StatLayoutItem[],
  layout: StatLayout,
  dragKey: ShareStatKey,
  rows: number,
): ShareStatPosition[] {
  const dragged = items.find((item) => item.key === dragKey);
  if (!dragged) return [];

  const grid = new OccupancyGrid();
  occupyLayout(grid, items, layout, dragKey);

  const span = STAT_SPAN[dragged.width];
  const cells: ShareStatPosition[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (const col of getFreeColumnsInRow(grid.getRow(row), span)) {
      cells.push({ row, col });
    }
  }

  return cells;
}
