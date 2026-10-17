<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { CSSProperties } from 'vue';
import type {
  ShareCardElement,
  ShareStat,
  ShareStatKey,
  ShareStatPosition,
  ShareStatStyle,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { DEFAULT_SHARE_STAT_WIDTH } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import { MAX_SIDE_WIDGETS } from '@/entities/activity/model/activity-share/activity-share-widgets';
import {
  STAT_GRID_COLUMNS,
  getStatDropCells,
  getStatLayoutRows,
  getStatSpan,
  resolveStatLayout,
  applyStatDrop,
  compactBands,
  dropBand,
  getSideBlockedCells,
  placeBands,
  type BandSide,
  type BandState,
  type BandTarget,
  type StatBand,
  type StatDropCell,
  type StatDropTarget,
  type StatLayout,
} from '@/entities/activity/model/activity-share/activity-share-stat-layout';
import { useFlipAnimation } from '@/hooks/useFlipAnimation';
import { useLongPressDrag } from '@/hooks/useLongPressDrag';
import { dragTrash } from '@/hooks/useDragTrash';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import ShareCardStatItem from '@/views/photo-editor-view/components/artwork/ShareCardStatItem.vue';

const props = defineProps<{
  stats: ShareStat[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  statPositions: Partial<Record<ShareStatKey, ShareStatPosition>>;
  statStyle: ShareStatStyle;
  /** Высота места под трек (доля ширины) — эти строки сверху по умолчанию свободны. */
  reservedHeightRatio: number;
  /**
   * Полосы (график высоты, виджеты). Горизонтальная (`side: null`) занимает строку
   * сетки целиком, высота строки — по полосе (`ratio` — высота к ширине). Вертикальная
   * стоит в боковой колонке области трека (две крайние колонки сетки, по высоте —
   * до первой строки показателей). Ключ полосы — он же элемент выделения.
   * Содержимое — слот `band` с `{ bandKey, side }`.
   */
  bands?: readonly (StatBand & {
    key: ShareCardElement;
    ratio: number;
    side?: BandSide | null;
  })[];
  /** Можно ли ставить полосы в боковые колонки («Телеметрия»). */
  allowSides?: boolean;
}>();

const emit = defineEmits<{
  remove: [key: ShareStatKey];
  setWidth: [key: ShareStatKey, width: ShareStatWidth];
  setLayout: [layout: StatLayout];
  /** Высота строк над показателями (место под трек или карту), px раскладки. */
  reservedHeight: [height: number];
  /** Полосу перенесли: строки, боковые колонки и показатели после переноса. */
  dropBands: [state: BandState];
  /** Полосу (график, виджет) бросили в корзину. */
  removeBand: [key: ShareCardElement];
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

type DropCell = StatDropCell & { span: number; id: string };

type DragState = {
  key: ShareStatKey;
  dx: number;
  dy: number;
  /** Центр элемента в момент начала перетаскивания (координаты экрана). */
  originX: number;
  originY: number;
  /** Масштаб карточки на экране: смещение пальца делим на него. */
  scale: number;
  target: DropTarget | null;
  /** Исходное место: над корзиной показатель «стоит» на нём, остальные не сдвигаются. */
  originTarget: DropTarget | null;
};

type DropTarget = StatDropTarget;

const gridElement = useTemplateRef<HTMLElement>('grid');
const probe = useTemplateRef<InstanceType<typeof ShareCardStatItem>>('probe');

const rowHeight = ref(0);
const gridWidth = ref(0);
const gap = ref(0);
const drag = ref<DragState | null>(null);

// Высота строки = высота эталонного показателя (зависит от плотности и шрифтов).
useResizeObserver(
  () => [gridElement.value, probe.value?.$el as HTMLElement | undefined],
  () => {
    const grid = gridElement.value;
    const probeElement = probe.value?.$el as HTMLElement | undefined;
    if (!grid || !probeElement) return;

    rowHeight.value = probeElement.offsetHeight;
    gridWidth.value = grid.clientWidth;
    gap.value = parseFloat(getComputedStyle(grid).rowGap) || 0;
  },
);

function getWidth(key: ShareStatKey): ShareStatWidth {
  return props.statWidths[key] ?? DEFAULT_SHARE_STAT_WIDTH;
}

const items = computed(() =>
  props.stats.map((stat) => ({ key: stat.key, width: getWidth(stat.key) })),
);

/** Первая строка под местом для трека: туда по умолчанию встают показатели. */
const startRow = computed(() => {
  if (!props.reservedHeightRatio || !rowHeight.value) return 0;

  const reservedHeight = gridWidth.value * props.reservedHeightRatio;
  return Math.ceil((reservedHeight + gap.value) / (rowHeight.value + gap.value));
});

// Место под трек округляется до целых строк — блок карты подгоняется под него.
watch(
  () => (startRow.value ? startRow.value * (rowHeight.value + gap.value) - gap.value : 0),
  (height) => emit('reservedHeight', height),
  { immediate: true },
);

const bands = computed(() => props.bands ?? []);
const rowBands = computed(() => bands.value.filter((band) => !band.side));
const ratios = computed(() =>
  Object.fromEntries(bands.value.map((band) => [band.key, band.ratio])),
);

/** Порядок вертикальных полос в боковых колонках. */
const sides = computed<Record<BandSide, string[]>>(() => ({
  left: bands.value.filter((band) => band.side === 'left').map((band) => band.key),
  right: bands.value.filter((band) => band.side === 'right').map((band) => band.key),
}));

/** Клетки под боковыми колонками — показатели туда не встают. */
const blockedCells = computed(() => getSideBlockedCells(sides.value, startRow.value));

/*
 * Строки в настройках (позиции показателей и строки полос) хранятся ОТНОСИТЕЛЬНО
 * первой строки под треком (`startRow`): она меняется, когда убирают или возвращают трек
 * и меняют плотность, — и раскладка должна ехать вместе с ней, а не налезать на трек
 * или оставлять дыру. Внутри сетки — абсолютные строки; наружу — снова относительные.
 */
function shiftLayoutRows<L extends Partial<Record<string, ShareStatPosition>>>(
  layout: L,
  shift: number,
): L {
  return Object.fromEntries(
    Object.entries(layout).map(([key, position]) => [
      key,
      position ? { row: position.row + shift, col: position.col } : position,
    ]),
  ) as L;
}

function relativeRows(rows: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row - startRow.value]));
}

const absolutePositions = computed(() => shiftLayoutRows(props.statPositions, startRow.value));

/** Желаемые строки полос: по порядку, не выше первой строки под треком/картой. */
const desiredBandRows = computed(() =>
  placeBands(
    rowBands.value.map((band) => ({
      key: band.key,
      row: band.row === null ? null : band.row + startRow.value,
    })),
    startRow.value,
  ),
);

/**
 * Строки полос без пустых строк над ними. Поджатие считается по черновой раскладке,
 * а итоговая раскладка показателей — уже с поджатыми строками: иначе места для броска
 * (по поджатым) и раскладка (по исходным) расходятся и показатель «отскакивает».
 */
const bandRows = computed(() =>
  compactBands(
    desiredBandRows.value,
    resolveStatLayout(items.value, absolutePositions.value, {
      startRow: startRow.value,
      blockedRows: Object.values(desiredBandRows.value),
      blockedCells: blockedCells.value,
    }),
    startRow.value,
  ),
);

const layout = computed(() =>
  resolveStatLayout(items.value, absolutePositions.value, {
    startRow: startRow.value,
    blockedRows: Object.values(bandRows.value),
    blockedCells: blockedCells.value,
  }),
);

/** Раскладку — в настройки: строки относительно первой строки под треком. */
function emitLayout(next: StatLayout) {
  emit('setLayout', shiftLayoutRows(next, -startRow.value));
}

const blockedRows = computed(() => Object.values(bandRows.value));

const rows = computed(() =>
  Math.max(
    getStatLayoutRows(layout.value),
    startRow.value,
    ...blockedRows.value.map((row) => row + 1),
  ),
);

type BandDragState = {
  key: string;
  dx: number;
  dy: number;
  scale: number;
  /** Где была полоса в начале (px раскладки от левого верхнего угла сетки) — по ней едет «призрак». */
  origin: { left: number; top: number; width: number; height: number };
  /** Снимок геометрии в начале переноса: верх и высота строк, центры полос в колонках. */
  rowTops: number[];
  rowHeights: number[];
  sideCenters: Record<string, number>;
  side: BandSide | null;
  /** Исходное место: отпустили там же — ничего не меняем (пустой шаг истории). */
  originTarget: BandTarget;
  target: BandTarget;
};

const bandDrag = ref<BandDragState | null>(null);

const bandState = computed<BandState>(() => ({
  rows: bandRows.value,
  sides: sides.value,
  layout: layout.value,
}));

/** Раскладка, если отпустить полосу сейчас: показатели и другие полосы уже расступились. */
const preview = computed<BandState>(() => {
  const drag = bandDrag.value;
  return drag ? dropBand(bandState.value, drag.key, drag.target) : bandState.value;
});

const displayLayout = computed(() => preview.value.layout);

const gridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(${STAT_GRID_COLUMNS}, minmax(0, 1fr))`,
  gridTemplateRows: rowHeight.value
    ? `repeat(${rows.value}, minmax(${rowHeight.value}px, auto))`
    : undefined,
}));

function placementStyle({ row, col }: ShareStatPosition, span: number): CSSProperties {
  return { gridRow: `${row + 1}`, gridColumn: `${col + 1} / span ${span}` };
}

function itemStyle(key: ShareStatKey): CSSProperties {
  const style = placementStyle(displayLayout.value[key], getStatSpan(getWidth(key)));
  if (drag.value?.key === key) {
    const { dx, dy, scale } = drag.value;
    style.transform = `translate(${dx / scale}px, ${dy / scale}px)`;
  }
  return style;
}

// Сетка-подсказка: пустые строки — по ширине перетаскиваемого показателя,
// строки с показателями — по их ширине; занятые места не рисуются.
const dropCells = computed<DropCell[]>(() => {
  if (!drag.value) return [];

  return getStatDropCells(
    items.value,
    layout.value,
    drag.value.key,
    rows.value,
    blockedRows.value,
    blockedCells.value,
  ).map((cell) => ({
    ...cell,
    span: getStatSpan(cell.width),
    id: `${cell.row}:${cell.col}`,
  }));
});

function isTarget(cell: DropCell): boolean {
  const target = drag.value?.target;
  return target?.kind === 'cell' && target.row === cell.row && target.col === cell.col;
}

function isSwapTarget(key: ShareStatKey): boolean {
  const target = drag.value?.target;
  return target?.kind === 'swap' && target.key === key;
}

// Анимируем смену ширины, перестановки, добавление и удаление показателей.
useFlipAnimation(gridElement, () => ({
  keys: props.stats.map((stat) => stat.key).sort(),
  widths: props.statWidths,
  layout: displayLayout.value,
}));

/** Ближайшая к центру перетаскиваемого показателя цель: свободное место или другой показатель. */
function findNearestTarget(): DropTarget | null {
  const state = drag.value;
  const grid = gridElement.value;
  if (!state || !grid) return null;

  const centerX = state.originX + state.dx;
  const centerY = state.originY + state.dy;
  let nearest: DropTarget | null = null;
  let nearestDistance = Infinity;

  const consider = (element: HTMLElement, target: DropTarget | null) => {
    if (!target) return;

    const rect = element.getBoundingClientRect();
    const distance = Math.hypot(
      rect.left + rect.width / 2 - centerX,
      rect.top + rect.height / 2 - centerY,
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = target;
    }
  };

  grid.querySelectorAll<HTMLElement>('[data-drop-cell]').forEach((element) => {
    const cell = dropCells.value.find((item) => item.id === element.dataset.dropCell);
    consider(element, cell ? { kind: 'cell', ...cell } : null);
  });

  grid.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((element) => {
    const key = element.dataset.flipKey as ShareStatKey;
    consider(element, key === state.key ? null : { kind: 'swap', key });
  });

  return nearest;
}

const { start: startDrag, isClickSuppressed } = useLongPressDrag<ShareStatKey>({
  onStart: (key) => {
    const element = gridElement.value?.querySelector<HTMLElement>(`[data-flip-key="${key}"]`);
    const rect = element?.getBoundingClientRect();

    selected.value = null;
    const originTarget: DropTarget = { kind: 'cell', ...layout.value[key], width: getWidth(key) };
    drag.value = {
      key,
      dx: 0,
      dy: 0,
      originX: rect ? rect.left + rect.width / 2 : 0,
      originY: rect ? rect.top + rect.height / 2 : 0,
      scale: rect && element?.offsetWidth ? rect.width / element.offsetWidth : 1,
      target: originTarget,
      originTarget,
    };
  },
  onMove: (_key, dx, dy) => {
    if (!drag.value) return;
    drag.value.dx = dx;
    drag.value.dy = dy;
    drag.value.target = dragTrash.state.over
      ? drag.value.originTarget
      : (findNearestTarget() ?? drag.value.target);
  },
  onTrash: (key) => remove(key),
  onEnd: (key, dropped) => {
    const target = drag.value?.target;
    drag.value = null;

    if (!dropped || !target) return;
    // Отпустили на своём же месте (долгое нажатие без движения) — ничего не меняем,
    // иначе в историю попал бы пустой шаг.
    const current = layout.value[key];
    if (
      target.kind === 'cell' &&
      current &&
      target.row === current.row &&
      target.col === current.col &&
      target.width === getWidth(key)
    ) {
      return;
    }

    const result = applyStatDrop(
      items.value,
      layout.value,
      key,
      target,
      startRow.value,
      blockedRows.value,
      blockedCells.value,
    );
    result.widths.forEach((width, statKey) => {
      if (width !== getWidth(statKey)) emit('setWidth', statKey, width);
    });
    emitLayout(result.layout);
  },
});

function handlePointerDown(event: PointerEvent, key: ShareStatKey) {
  // Выделенный показатель двигается сразу, остальные — после долгого нажатия.
  startDrag(event, key, event.pointerType === 'mouse' || selected.value === key);
}

function toggleSelected(key: ShareStatKey) {
  if (isClickSuppressed()) return;
  selected.value = selected.value === key ? null : key;
}

function setWidth(key: ShareStatKey, width: ShareStatWidth) {
  emit('setWidth', key, width);
  // Показатель с новой шириной остаётся на месте, соседи сдвигаются при необходимости.
  emitLayout(
    resolveStatLayout(
      items.value.map((item) => (item.key === key ? { key, width } : item)),
      layout.value,
      {
        startRow: startRow.value,
        priorityKey: key,
        blockedRows: blockedRows.value,
        blockedCells: blockedCells.value,
      },
    ),
  );
}

// Перенос полосы: пальцем — после долгого нажатия, мышью и выделенную — сразу.
// За пальцем едет «призрак», а на месте броска — пунктир; остальные сразу расступаются.
function measureGrid() {
  const grid = gridElement.value!;
  const rect = grid.getBoundingClientRect();
  const scale = grid.offsetWidth ? rect.width / grid.offsetWidth : 1;
  const tracks = getComputedStyle(grid)
    .gridTemplateRows.split(' ')
    .map((value) => parseFloat(value))
    .filter(Number.isFinite);
  const rowTops: number[] = [];
  let top = 0;
  for (const height of tracks) {
    rowTops.push(top);
    top += height + gap.value;
  }
  return { rect, scale, rowTops, rowHeights: tracks };
}

function relativeBox(element: HTMLElement, gridRect: DOMRect, scale: number) {
  const rect = element.getBoundingClientRect();
  return {
    left: (rect.left - gridRect.left) / scale,
    top: (rect.top - gridRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

/** Цель по центру «призрака»: боковая колонка (у краёв области трека) или строка. */
function findBandTarget(drag: BandDragState): BandTarget {
  const x = drag.origin.left + drag.origin.width / 2 + drag.dx / drag.scale;
  const y = drag.origin.top + drag.origin.height / 2 + drag.dy / drag.scale;
  const reserved = startRow.value ? startRow.value * (rowHeight.value + gap.value) - gap.value : 0;

  if (props.allowSides && startRow.value && y < reserved) {
    const side = x < gridWidth.value / 3 ? 'left' : x > (gridWidth.value * 2) / 3 ? 'right' : null;
    // В заполненную колонку не ставим — тогда цель по строкам, как в середине.
    const others = side ? sides.value[side].filter((key) => key !== drag.key) : [];
    if (side && others.length < MAX_SIDE_WIDGETS) {
      const index = sides.value[side].filter(
        (key) => key !== drag.key && (drag.sideCenters[key] ?? Infinity) < y,
      ).length;
      return { kind: 'side', side, index };
    }
  }

  // Строка, на которую указывает центр; ниже последней — новая строка в конце.
  const fromRow = bandRows.value[drag.key] !== undefined;
  const last = Math.max(startRow.value, rows.value - (fromRow ? 1 : 0));
  let row = drag.rowTops.findIndex(
    (top, index) => y < top + (drag.rowHeights[index] ?? 0) + gap.value / 2,
  );
  if (row < 0) row = last;
  return { kind: 'row', row: Math.min(last, Math.max(startRow.value, row)) };
}

const { start: startBandDrag, isClickSuppressed: isBandClickSuppressed } = useLongPressDrag<string>(
  {
    onStart: (key) => {
      const grid = gridElement.value;
      const element = grid?.querySelector<HTMLElement>(`[data-band-key="${key}"]`);
      if (!grid || !element) return;
      const { rect, scale, rowTops, rowHeights } = measureGrid();
      const sideCenters: Record<string, number> = {};
      grid.querySelectorAll<HTMLElement>('[data-band-side]').forEach((item) => {
        const box = relativeBox(item, rect, scale);
        sideCenters[item.dataset.bandKey!] = box.top + box.height / 2;
      });
      const side = sides.value.left.includes(key)
        ? 'left'
        : sides.value.right.includes(key)
          ? 'right'
          : null;
      const row = bandRows.value[key];
      const initial: BandTarget =
        side !== null
          ? { kind: 'side', side, index: sides.value[side].indexOf(key) }
          : { kind: 'row', row: row ?? startRow.value };
      selected.value = null;
      bandDrag.value = {
        key,
        dx: 0,
        dy: 0,
        scale,
        origin: relativeBox(element, rect, scale),
        rowTops,
        rowHeights,
        sideCenters,
        side,
        originTarget: initial,
        target: initial,
      };
    },
    onMove: (_key, dx, dy) => {
      const drag = bandDrag.value;
      if (!drag) return;
      drag.dx = dx;
      drag.dy = dy;
      // Над корзиной полоса «на своём месте» — остальные не расступаются.
      drag.target = dragTrash.state.over ? drag.originTarget : findBandTarget(drag);
    },
    onTrash: (key) => {
      if (selected.value === key) selected.value = null;
      emit('removeBand', key as ShareCardElement);
    },
    onEnd: (_key, dropped) => {
      const drag = bandDrag.value;
      const result = preview.value;
      bandDrag.value = null;
      if (!dropped || !drag) return;
      if (JSON.stringify(drag.target) === JSON.stringify(drag.originTarget)) return;
      emit('dropBands', {
        rows: relativeRows(result.rows),
        sides: result.sides,
        layout: shiftLayoutRows(result.layout, -startRow.value),
      });
    },
  },
);

function handleBandPointerDown(event: PointerEvent, key: ShareCardElement) {
  startBandDrag(event, key, event.pointerType === 'mouse' || selected.value === key);
}

// Отпустили после перетаскивания — это не тап: выделение не переключаем.
function handleBandClickCapture(event: MouseEvent) {
  if (isBandClickSuppressed()) event.stopPropagation();
}

/** Горизонтальные полосы с их строками (в т.ч. во время переноса). */
const displayRowBands = computed(() =>
  Object.entries(preview.value.rows).map(([key, row]) => ({
    key: key as ShareCardElement,
    row,
    ratio: ratios.value[key] ?? 0.2,
  })),
);

/** Боковые колонки: в строках области трека, по две крайние колонки сетки. */
const displaySides = computed(() =>
  (['left', 'right'] as const)
    .filter(() => startRow.value > 0)
    .map((side) => ({ side, keys: preview.value.sides[side] as ShareCardElement[] }))
    .filter((column) => column.keys.length),
);

function sideStyle(side: BandSide): CSSProperties {
  return {
    gridRow: `1 / span ${startRow.value}`,
    gridColumn: side === 'left' ? '1 / span 2' : '5 / span 2',
  };
}

const ghostStyle = computed<CSSProperties>(() => {
  const drag = bandDrag.value;
  if (!drag) return {};
  return {
    left: `${drag.origin.left + drag.dx / drag.scale}px`,
    top: `${drag.origin.top + drag.dy / drag.scale}px`,
    width: `${drag.origin.width}px`,
    height: `${drag.origin.height}px`,
  };
});

function remove(key: ShareStatKey) {
  if (selected.value === key) {
    selected.value = null;
  }
  emit('remove', key);
}
</script>

<template>
  <div
    ref="grid"
    class="stats-grid"
    :class="{ 'stats-grid--dragging': drag || bandDrag, 'stats-grid--stat-dragging': drag }"
    :style="gridStyle"
  >
    <div
      v-for="cell in dropCells"
      :key="cell.id"
      class="stats-grid__cell export-hidden"
      :class="{ 'stats-grid__cell--target': isTarget(cell) }"
      :style="placementStyle(cell, cell.span)"
      :data-drop-cell="cell.id"
      aria-hidden="true"
    />

    <ShareCardStatItem
      v-for="stat in stats"
      :key="stat.key"
      :data-flip-key="stat.key"
      :label="stat.label"
      :value="stat.value"
      :width="getWidth(stat.key)"
      :selected="selected === stat.key"
      :class="{
        'stat--dragging': drag?.key === stat.key,
        'stat--over-trash': drag?.key === stat.key && dragTrash.state.over,
        'stat--swap-target': isSwapTarget(stat.key),
      }"
      :style="itemStyle(stat.key)"
      @pointerdown="handlePointerDown($event, stat.key)"
      @select="toggleSelected(stat.key)"
      @remove="remove(stat.key)"
      :stat-style="statStyle"
      @set-width="setWidth(stat.key, $event)"
    />

    <!-- Горизонтальные полосы. Перетаскиваемая — пунктирное место, куда она встанет. -->
    <div
      v-for="band in displayRowBands"
      :key="band.key"
      class="stats-grid__band"
      :class="{ 'stats-grid__band--placeholder': bandDrag?.key === band.key }"
      :style="{
        gridRow: `${band.row + 1}`,
        gridColumn: '1 / -1',
        aspectRatio: `${1 / band.ratio}`,
      }"
      :data-band-key="band.key"
      @pointerdown="handleBandPointerDown($event, band.key)"
      @click.capture="handleBandClickCapture"
    >
      <slot name="band" :band-key="band.key" :side="null" />
    </div>

    <!-- Боковые колонки: вертикальные полосы у краёв области трека. -->
    <div
      v-for="column in displaySides"
      :key="column.side"
      class="stats-grid__side"
      :style="sideStyle(column.side)"
    >
      <div
        v-for="key in column.keys"
        :key="key"
        class="stats-grid__band stats-grid__band--vertical"
        :class="{ 'stats-grid__band--placeholder': bandDrag?.key === key }"
        :data-band-key="key"
        :data-band-side="column.side"
        @pointerdown="handleBandPointerDown($event, key)"
        @click.capture="handleBandClickCapture"
      >
        <slot name="band" :band-key="key" :side="column.side" />
      </div>
    </div>

    <!-- «Призрак» перетаскиваемой полосы — едет за пальцем в прежнем виде. -->
    <div
      v-if="bandDrag"
      class="stats-grid__ghost export-hidden"
      :class="{ 'stats-grid__ghost--over-trash': dragTrash.state.over }"
      :style="ghostStyle"
      aria-hidden="true"
    >
      <slot name="band" :band-key="bandDrag.key as ShareCardElement" :side="bandDrag.side" />
    </div>

    <!-- Эталон для высоты строки сетки. -->
    <ShareCardStatItem
      ref="probe"
      class="stats-grid__probe"
      label="Дистанция"
      value="00.00 км"
      width="full"
      :selected="false"
      :stat-style="statStyle"
      aria-hidden="true"
      inert
    />
  </div>
</template>

<style scoped>
.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--share-stat-gap, 12px);
  /* Смена плотности — плавно, без рывка. */
  transition: gap 220ms ease;
  min-width: 0;
  /* Сетка занимает всю высоту карточки: пустые места пропускают касания к треку. */
  pointer-events: none;
}

/* Перетаскиваемый показатель поднимаем над треком. */
.stats-grid--dragging {
  z-index: 6;
}

.stats-grid__cell {
  z-index: 0;
  pointer-events: none;
  border: 1px dashed color-mix(in srgb, var(--share-text) 28%, transparent);
  border-radius: 12px;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.stats-grid__cell--target {
  border-color: color-mix(in srgb, var(--share-text) 70%, transparent);
  background: color-mix(in srgb, var(--share-text) 8%, transparent);
}

.stats-grid :deep(.stat) {
  z-index: 1;
  pointer-events: auto;
}

.stats-grid :deep(.stat--swap-target) {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--share-text) 70%, transparent);
  background: color-mix(in srgb, var(--share-text) 8%, transparent);
}

.stats-grid :deep(.stat--dragging) {
  z-index: 10;
  background: color-mix(in srgb, var(--share-background) 88%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  cursor: grabbing;
  transition: none;
}

.stats-grid__band {
  z-index: 1;
  min-width: 0;
  pointer-events: auto;
  /* Долгое нажатие пальцем — перенос, а не выделение текста или меню. */
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
}

.stats-grid__band > :deep(*) {
  height: 100%;
}

/* Место, куда встанет перетаскиваемая полоса: пунктир её размера, содержимое скрыто. */
.stats-grid__band--placeholder {
  border: 1px dashed color-mix(in srgb, var(--share-text) 70%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--share-text) 8%, transparent);
}

.stats-grid__band--placeholder > :deep(*) {
  visibility: hidden;
}

.stats-grid__side {
  z-index: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: var(--share-stat-gap, 12px);
  pointer-events: none;
}

.stats-grid__band--vertical {
  flex: 1 1 0;
  min-height: 0;
}

.stats-grid__ghost {
  position: absolute;
  z-index: 10;
  border-radius: 8px;
  background: color-mix(in srgb, var(--share-background) 88%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  pointer-events: none;
}

/* Над корзиной: элемент бледнеет и уменьшается — «сейчас удалится». */
.stats-grid :deep(.stat--over-trash),
.stats-grid__ghost--over-trash {
  opacity: 0.45;
  outline: 2px solid #e5484d;
  outline-offset: 2px;
  scale: 0.92;
}

.stats-grid__ghost > :deep(*) {
  height: 100%;
}

.stats-grid--stat-dragging .stats-grid__band {
  /* Пока тащат показатель, полосы — просто занятое место. */
  pointer-events: none;
}

.stats-grid__probe {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
}
</style>
