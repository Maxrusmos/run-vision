<script setup lang="ts">
import { computed, useId } from 'vue';
import type { RoutePoint } from '@/entities/activity/lib/route-projection';
import type { ShareRouteStyle } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  findRouteStyle,
  type RouteLayerColor,
  type RouteStrokeLayer,
} from '@/entities/activity/model/activity-share/activity-share-route-styles';

/** Базовая толщина линии и радиус точки старта — в единицах слоя трека. */
const BASE_STROKE = 8;
const START_RADIUS = 11;
const DASH = { dash: [24, 16], dot: [0, 16] } as const;

/**
 * Трек в выбранном стиле: набор копий линии (SVG-фрагмент).
 * Точки — относительно центра трека; `unit` — сколько локальных единиц SVG
 * в одной единице слоя трека (на карточке это 1 / масштаб трека).
 */
const props = defineProps<{
  points: string;
  start: RoutePoint | null;
  styleId: ShareRouteStyle;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  unit: number;
}>();

// Уникальный id градиента: на странице одновременно и карточка, и превью в меню.
const gradientId = `route-gradient-${useId()}`;

const style = computed(() => findRouteStyle(props.styleId));

/** Градиенты слоёв: у каждого слоя свой (цвета Pro-стилей разные), id — по номеру слоя. */
const gradients = computed(() =>
  style.value.layers.flatMap((layer, index) => {
    if (!layer.gradient) return [];
    const colors =
      layer.gradient === true
        ? [props.routeColor, props.textColor]
        : layer.gradient.map((color) => resolveColor(color));
    return [
      {
        id: `${gradientId}-${index}`,
        stops: colors.map((color, stop) => ({
          offset: colors.length > 1 ? stop / (colors.length - 1) : 0,
          color,
        })),
      },
    ];
  }),
);

function resolveColor(color: RouteLayerColor = 'route'): string {
  if (color === 'route') return props.routeColor;
  if (color === 'text') return props.textColor;
  if (color === 'background') return props.backgroundColor;
  return color;
}

function layerTransform(layer: RouteStrokeLayer): string {
  const dx = (layer.dx ?? 0) * props.unit;
  const dy = (layer.dy ?? 0) * props.unit;
  return `translate(${dx} ${dy}) scale(${layer.scale ?? 1})`;
}

/** Сдвиги копий выдавливания — от дальней к ближней. */
function extrudeOffsets(layer: RouteStrokeLayer): { dx: number; dy: number }[] {
  const extrude = layer.extrude;
  if (!extrude) return [];
  return Array.from({ length: extrude.steps }, (_, index) => {
    const distance = extrude.steps - index;
    return { dx: extrude.dx * distance * props.unit, dy: extrude.dy * distance * props.unit };
  });
}

function layerStroke(layer: RouteStrokeLayer, index: number): string {
  return layer.gradient ? `url(#${gradientId}-${index})` : resolveColor(layer.color);
}

function layerDash(layer: RouteStrokeLayer): string | undefined {
  return layer.dash ? DASH[layer.dash].map((value) => value * props.unit).join(' ') : undefined;
}
</script>

<template>
  <g>
    <defs v-if="gradients.length">
      <linearGradient
        v-for="gradient in gradients"
        :id="gradient.id"
        :key="gradient.id"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
      >
        <stop
          v-for="stop in gradient.stops"
          :key="stop.offset"
          :offset="stop.offset"
          :stop-color="stop.color"
        />
      </linearGradient>
    </defs>

    <!-- Прозрачность — у элемента целиком (opacity), а не у обводки (stroke-opacity):
         иначе на iOS в узлах линии полупрозрачные куски накладываются и видны точки. -->
    <template v-for="(layer, index) in style.layers" :key="index">
      <!-- Выдавливание: непрозрачные копии в полупрозрачной группе — грань без точек в узлах. -->
      <g v-if="layer.extrude" :opacity="layer.opacity ?? 1">
        <polyline
          v-for="(offset, step) in extrudeOffsets(layer)"
          :key="step"
          :transform="`translate(${offset.dx} ${offset.dy})`"
          :points="points"
          fill="none"
          :stroke="layerStroke(layer, index)"
          :stroke-width="BASE_STROKE * (layer.width ?? 1) * unit"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <polyline
        v-else
        :transform="layerTransform(layer)"
        :points="points"
        fill="none"
        :stroke="layerStroke(layer, index)"
        :opacity="layer.opacity ?? 1"
        :stroke-width="BASE_STROKE * (layer.width ?? 1) * unit"
        :stroke-dasharray="layerDash(layer)"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <circle v-if="start" :cx="start.x" :cy="start.y" :r="START_RADIUS * unit" :fill="routeColor" />
  </g>
</template>
