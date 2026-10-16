<script setup lang="ts">
import type { RoutePoint } from '@/entities/activity/lib/route-projection';

/**
 * Флажки на треке (SVG-фрагмент): отметки километров, кольцо старта и клетчатый
 * флажок финиша. Размеры — в единицах слоя трека (ширина карточки = 1000),
 * `unit` — пикселей в единице. Флажки «стоят» в экранных координатах —
 * при наклоне карты они остаются вертикальными.
 */
const props = defineProps<{
  kmPoints: (RoutePoint & { km: number })[];
  start: RoutePoint | null;
  finish: RoutePoint | null;
  startFinish: boolean;
  textColor: string;
  backgroundColor: string;
  unit: number;
}>();

const POLE = 44;
const FLAG_HEIGHT = 30;
const FONT_SIZE = 21;
const DIGIT_WIDTH = 12;
const FLAG_PADDING = 9;
const START_RING = 17;

/** Флажок: древко вверх от точки трека, полотнище справа. */
function flag(point: RoutePoint, label: string) {
  const u = props.unit;
  const width = (FLAG_PADDING * 2 + DIGIT_WIDTH * label.length) * u;
  const top = point.y - POLE * u;
  return {
    pole: `M${point.x} ${point.y} L${point.x} ${top}`,
    x: point.x,
    y: top,
    width,
    height: FLAG_HEIGHT * u,
    textX: point.x + width / 2,
    // Базовая линия по центру полотнища (без dominant-baseline — его не везде переносит экспорт).
    textY: top + (FLAG_HEIGHT * u) / 2 + FONT_SIZE * u * 0.36,
  };
}

/** Клетки флажка финиша: 3 × 2. */
function checkers(point: RoutePoint) {
  const u = props.unit;
  const cell = (FLAG_HEIGHT / 2) * u;
  const top = point.y - POLE * u;
  const cells: { x: number; y: number; size: number; dark: boolean }[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        x: point.x + col * cell,
        y: top + row * cell,
        size: cell,
        dark: (row + col) % 2 === 0,
      });
    }
  }
  return { pole: `M${point.x} ${point.y} L${point.x} ${top}`, cells, x: point.x, y: top, cell };
}
</script>

<template>
  <g>
    <g v-for="point in kmPoints" :key="point.km">
      <template v-for="item in [flag(point, String(point.km))]" :key="item.pole">
        <path :d="item.pole" :stroke="textColor" :stroke-width="3 * unit" opacity="0.75" />
        <rect
          :x="item.x"
          :y="item.y"
          :width="item.width"
          :height="item.height"
          :rx="4 * unit"
          :fill="textColor"
          opacity="0.88"
        />
        <text
          :x="item.textX"
          :y="item.textY"
          :font-size="FONT_SIZE * unit"
          font-weight="700"
          text-anchor="middle"
          :fill="backgroundColor"
        >
          {{ point.km }}
        </text>
      </template>
    </g>

    <template v-if="startFinish">
      <circle
        v-if="start"
        :cx="start.x"
        :cy="start.y"
        :r="START_RING * unit"
        fill="none"
        :stroke="textColor"
        :stroke-width="4 * unit"
      />
      <g v-if="finish">
        <template v-for="item in [checkers(finish)]" :key="item.pole">
          <path :d="item.pole" :stroke="textColor" :stroke-width="3 * unit" />
          <rect
            :x="item.x"
            :y="item.y"
            :width="item.cell * 3"
            :height="item.cell * 2"
            fill="none"
            :stroke="textColor"
            :stroke-width="2 * unit"
          />
          <rect
            v-for="(cell, index) in item.cells"
            :key="index"
            :x="cell.x"
            :y="cell.y"
            :width="cell.size"
            :height="cell.size"
            :fill="cell.dark ? textColor : backgroundColor"
          />
        </template>
      </g>
    </template>
  </g>
</template>
