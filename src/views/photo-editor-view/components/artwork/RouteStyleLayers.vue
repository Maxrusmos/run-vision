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
const hasGradient = computed(() => style.value.layers.some((layer) => layer.gradient));

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

function layerStroke(layer: RouteStrokeLayer): string {
  return layer.gradient ? `url(#${gradientId})` : resolveColor(layer.color);
}

function layerDash(layer: RouteStrokeLayer): string | undefined {
  return layer.dash ? DASH[layer.dash].map((value) => value * props.unit).join(' ') : undefined;
}
</script>

<template>
  <g>
    <defs v-if="hasGradient">
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="routeColor" />
        <stop offset="1" :stop-color="textColor" />
      </linearGradient>
    </defs>

    <polyline
      v-for="(layer, index) in style.layers"
      :key="index"
      :transform="layerTransform(layer)"
      :points="points"
      fill="none"
      :stroke="layerStroke(layer)"
      :stroke-opacity="layer.opacity ?? 1"
      :stroke-width="BASE_STROKE * (layer.width ?? 1) * unit"
      :stroke-dasharray="layerDash(layer)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <circle v-if="start" :cx="start.x" :cy="start.y" :r="START_RADIUS * unit" :fill="routeColor" />
  </g>
</template>
