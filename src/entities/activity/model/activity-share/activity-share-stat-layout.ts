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

/** Место для перетаскиваемого показателя и ширина, которую он там получит. */
export type StatDropCell = ShareStatPosition & {
  width: ShareStatWidth;
};

export function getStatSpan(width: ShareStatWidth): number {
  return STAT_SPAN[width];
}

/** Привязывает колонку к сетке ширины: треть — 0/2/4, половина — 0/3, вся ширина — 0. */
export function snapStatColumn(col: number, width: ShareStatWidth): number {
  const span = STAT_SPAN[width];
  return Math.min(STAT_GRID_COLUMNS - span, Math.max(0, Math.round(col / span) * span));
}

type RowState = {
  /** Ширина показателей строки; null — строка пустая. */
  width: ShareStatWidth | null;
  cells: boolean[];
};

/**
 * Занятость сетки. Правило: в строке все показатели одной ширины
 * и стоят по её сетке — так раскладка всегда остаётся ровной.
 */
class LayoutGrid {
  private readonly rows = new Map<number, RowState>();

  /** Строки, целиком занятые другим элементом (график высоты): показатели туда не встают. */
  constructor(blockedRows: readonly number[] = []) {
    for (const row of blockedRows) {
      this.rows.set(row, {
        width: 'full',
        cells: Array.from({ length: STAT_GRID_COLUMNS }, () => true),
      });
    }
  }

  private getRow(row: number): RowState {
    let state = this.rows.get(row);
    if (!state) {
      state = { width: null, cells: Array.from({ length: STAT_GRID_COLUMNS }, () => false) };
      this.rows.set(row, state);
    }
    return state;
  }

  getRowWidth(row: number): ShareStatWidth | null {
    return this.getRow(row).width;
  }

  canPlace(row: number, col: number, width: ShareStatWidth): boolean {
    const span = STAT_SPAN[width];
    const state = this.getRow(row);

    return (
      col % span === 0 &&
      col + span <= STAT_GRID_COLUMNS &&
      (state.width === null || state.width === width) &&
      state.cells.slice(col, col + span).every((cell) => !cell)
    );
  }

  place(row: number, col: number, width: ShareStatWidth) {
    const state = this.getRow(row);
    state.width = width;
    state.cells.fill(true, col, col + STAT_SPAN[width]);
  }

  /** Свободные места в строке для показателя этой ширины. */
  getFreeColumns(row: number, width: ShareStatWidth): number[] {
    const columns: number[] = [];
    for (let col = 0; col < STAT_GRID_COLUMNS; col += STAT_SPAN[width]) {
      if (this.canPlace(row, col, width)) columns.push(col);
    }
    return columns;
  }

  findFreeCell(fromRow: number, width: ShareStatWidth): ShareStatPosition {
    // Ищем вниз от строки; сетка растёт, поэтому место всегда найдётся.
    for (let row = Math.max(0, fromRow); ; row += 1) {
      const [col] = this.getFreeColumns(row, width);
      if (col !== undefined) return { row, col };
    }
  }
}

type ResolveOptions = {
  /** Строка, с которой автоматически ставятся показатели без позиции. */
  startRow?: number;
  /** Этот показатель ставится первым и не сдвигается остальными. */
  priorityKey?: ShareStatKey;
  /** Строки, занятые графиком высоты. */
  blockedRows?: readonly number[];
};

/**
 * Раскладывает показатели по сетке без наложений.
 *
 * Показатели с позицией остаются на месте (сначала priorityKey, затем по порядку строк),
 * а если место занято или строка другой ширины — сдвигаются на ближайшее подходящее
 * место ниже. Показатели без позиции встают в первые свободные места, начиная со
 * `startRow`, в порядке списка.
 */
export function resolveStatLayout(
  items: StatLayoutItem[],
  positions: Partial<Record<ShareStatKey, ShareStatPosition>>,
  { startRow = 0, priorityKey, blockedRows }: ResolveOptions = {},
): StatLayout {
  const grid = new LayoutGrid(blockedRows);
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
    const desired = positions[item.key]!;
    const row = Math.max(0, Math.floor(desired.row));
    const col = snapStatColumn(desired.col, item.width);

    const position = grid.canPlace(row, col, item.width)
      ? { row, col }
      : grid.findFreeCell(row, item.width);
    grid.place(position.row, position.col, item.width);
    layout[item.key] = position;
  }

  for (const item of items.filter((entry) => !positions[entry.key])) {
    const position = grid.findFreeCell(startRow, item.width);
    grid.place(position.row, position.col, item.width);
    layout[item.key] = position;
  }

  return layout;
}

/** Количество строк, занятых раскладкой. */
export function getStatLayoutRows(layout: StatLayout): number {
  return Object.values(layout).reduce((rows, position) => Math.max(rows, position.row + 1), 0);
}

/**
 * Места, куда можно поставить перетаскиваемый показатель.
 *
 * Пустая строка размечается по ширине перетаскиваемого показателя. В строке, где уже
 * стоят показатели, свободные места повторяют их ширину (рядом с половиной — половина,
 * рядом с третью — трети), и показатель, попав туда, принимает эту ширину.
 */
export function getStatDropCells(
  items: StatLayoutItem[],
  layout: StatLayout,
  dragKey: ShareStatKey,
  rows: number,
  blockedRows: readonly number[] = [],
): StatDropCell[] {
  const dragged = items.find((item) => item.key === dragKey);
  if (!dragged) return [];

  const grid = new LayoutGrid(blockedRows);
  for (const item of items) {
    const position = layout[item.key];
    if (position && item.key !== dragKey) {
      grid.place(position.row, position.col, item.width);
    }
  }

  const cells: StatDropCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    const width = grid.getRowWidth(row) ?? dragged.width;
    for (const col of grid.getFreeColumns(row, width)) {
      cells.push({ row, col, width });
    }
  }

  return cells;
}

/**
 * Цель перетаскивания: свободное место (показатель встанет туда и примет его ширину)
 * или другой показатель (поменяются местами и размерами).
 */
export type StatDropTarget =
  ({ kind: 'cell' } & StatDropCell) | { kind: 'swap'; key: ShareStatKey };

export type StatDropResult = {
  /** Ширины после броска (только у показателей, которых он коснулся). */
  widths: Map<ShareStatKey, ShareStatWidth>;
  layout: StatLayout;
};

/** Раскладка после броска показателя `key` на цель. */
export function applyStatDrop(
  items: StatLayoutItem[],
  layout: StatLayout,
  key: ShareStatKey,
  target: StatDropTarget,
  startRow = 0,
  blockedRows: readonly number[] = [],
): StatDropResult {
  const widthOf = (statKey: ShareStatKey) =>
    items.find((item) => item.key === statKey)?.width ?? 'half';
  const widths = new Map<ShareStatKey, ShareStatWidth>();
  const positions: Partial<StatLayout> = { ...layout };

  if (target.kind === 'cell') {
    widths.set(key, target.width);
    positions[key] = { row: target.row, col: target.col };
  } else {
    // Меняются местами и размерами — строки остаются однородными.
    widths.set(key, widthOf(target.key));
    widths.set(target.key, widthOf(key));
    positions[key] = layout[target.key];
    positions[target.key] = layout[key];
  }

  const nextItems = items.map((item) => ({
    key: item.key,
    width: widths.get(item.key) ?? item.width,
  }));

  return {
    widths,
    layout: resolveStatLayout(nextItems, positions, { startRow, priorityKey: key, blockedRows }),
  };
}

/**
 * Перенос строки-полосы (график высоты) со строки `from` на строку `to`.
 * Строки между ними сдвигаются на одну навстречу: показатели со строки `to`
 * встают на прежнее место полосы, порядок остальных сохраняется.
 */
export function moveLayoutRow(layout: StatLayout, from: number, to: number): StatLayout {
  if (from === to) return layout;

  const moveRow = (row: number) => {
    if (from < to && row > from && row <= to) return row - 1;
    if (to < from && row >= to && row < from) return row + 1;
    return row;
  };

  return Object.fromEntries(
    Object.entries(layout).map(([key, position]) => [
      key,
      { row: moveRow(position.row), col: position.col },
    ]),
  ) as StatLayout;
}
