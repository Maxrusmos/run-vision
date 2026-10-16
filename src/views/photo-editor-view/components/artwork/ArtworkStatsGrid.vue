<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { CSSProperties } from 'vue';
import type {
  ShareCardElement,
  ShareStat,
  ShareStatKey,
  ShareStatPosition,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { DEFAULT_SHARE_STAT_WIDTH } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import {
  STAT_GRID_COLUMNS,
  getStatDropCells,
  getStatLayoutRows,
  getStatSpan,
  resolveStatLayout,
  applyStatDrop,
  type StatDropCell,
  type StatDropTarget,
  type StatLayout,
} from '@/entities/activity/model/activity-share/activity-share-stat-layout';
import { useFlipAnimation } from '@/hooks/useFlipAnimation';
import { useLongPressDrag } from '@/hooks/useLongPressDrag';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import ShareCardStatItem from '@/views/photo-editor-view/components/artwork/ShareCardStatItem.vue';

const props = defineProps<{
  stats: ShareStat[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  statPositions: Partial<Record<ShareStatKey, ShareStatPosition>>;
  showBorders: boolean;
  textColor: string;
  /** Высота места под трек (доля ширины) — эти строки сверху по умолчанию свободны. */
  reservedHeightRatio: number;
}>();

const emit = defineEmits<{
  remove: [key: ShareStatKey];
  setWidth: [key: ShareStatKey, width: ShareStatWidth];
  setLayout: [layout: StatLayout];
  changeTextColor: [color: string];
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
  target: DropTarget | null;
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

const layout = computed(() =>
  resolveStatLayout(items.value, props.statPositions, { startRow: startRow.value }),
);

const rows = computed(() => Math.max(getStatLayoutRows(layout.value), startRow.value));

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
  const style = placementStyle(layout.value[key], getStatSpan(getWidth(key)));
  if (drag.value?.key === key) {
    style.transform = `translate(${drag.value.dx}px, ${drag.value.dy}px)`;
  }
  return style;
}

// Сетка-подсказка: пустые строки — по ширине перетаскиваемого показателя,
// строки с показателями — по их ширине; занятые места не рисуются.
const dropCells = computed<DropCell[]>(() => {
  if (!drag.value) return [];

  return getStatDropCells(items.value, layout.value, drag.value.key, rows.value).map((cell) => ({
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
  layout: layout.value,
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
    drag.value = {
      key,
      dx: 0,
      dy: 0,
      originX: rect ? rect.left + rect.width / 2 : 0,
      originY: rect ? rect.top + rect.height / 2 : 0,
      target: { kind: 'cell', ...layout.value[key], width: getWidth(key) },
    };
  },
  onMove: (_key, dx, dy) => {
    if (!drag.value) return;
    drag.value.dx = dx;
    drag.value.dy = dy;
    drag.value.target = findNearestTarget() ?? drag.value.target;
  },
  onEnd: (key, dropped) => {
    const target = drag.value?.target;
    drag.value = null;

    if (!dropped || !target) return;

    const result = applyStatDrop(items.value, layout.value, key, target, startRow.value);
    result.widths.forEach((width, statKey) => {
      if (width !== getWidth(statKey)) emit('setWidth', statKey, width);
    });
    emit('setLayout', result.layout);
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
  emit(
    'setLayout',
    resolveStatLayout(
      items.value.map((item) => (item.key === key ? { key, width } : item)),
      layout.value,
      { startRow: startRow.value, priorityKey: key },
    ),
  );
}

function remove(key: ShareStatKey) {
  if (selected.value === key) {
    selected.value = null;
  }
  emit('remove', key);
}
</script>

<template>
  <div ref="grid" class="stats-grid" :class="{ 'stats-grid--dragging': drag }" :style="gridStyle">
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
      :show-border="showBorders"
      :class="{
        'stat--dragging': drag?.key === stat.key,
        'stat--swap-target': isSwapTarget(stat.key),
      }"
      :style="itemStyle(stat.key)"
      @pointerdown="handlePointerDown($event, stat.key)"
      @select="toggleSelected(stat.key)"
      @remove="remove(stat.key)"
      :text-color="textColor"
      @set-width="setWidth(stat.key, $event)"
      @change-text-color="emit('changeTextColor', $event)"
    />

    <!-- Эталон для высоты строки сетки. -->
    <ShareCardStatItem
      ref="probe"
      class="stats-grid__probe"
      label="Дистанция"
      value="00.00 км"
      width="full"
      :selected="false"
      :show-border="showBorders"
      :text-color="textColor"
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

.stats-grid__probe {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
}
</style>
