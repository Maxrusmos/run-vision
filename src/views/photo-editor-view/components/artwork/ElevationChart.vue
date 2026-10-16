<script setup lang="ts">
import { computed, useId } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { ShareElevationStyle } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ELEVATION_STYLE_SAMPLES,
  buildElevationShapes,
  getElevationProfile,
} from '@/entities/activity/model/activity-share/activity-share-elevation';

/** Толщина линии — в единицах слоя (ширина карточки = 1000), как у трека. */
const LINE_WIDTH = { line: 9, area: 7, steps: 6 } as const;

/**
 * График высоты (SVG-фрагмент без обёртки): на карточке и в превью меню.
 * Размеры — в пикселях раскладки; `unit` — пикселей в единице слоя.
 */
const props = defineProps<{
  track: ITrackPoint[];
  styleId: ShareElevationStyle;
  color: string;
  width: number;
  height: number;
  unit: number;
}>();

// Уникальный id градиента: на странице одновременно график карточки и превью.
const gradientId = `elevation-gradient-${useId()}`;

const profile = computed(() =>
  getElevationProfile(props.track, ELEVATION_STYLE_SAMPLES[props.styleId]),
);

/** Запас сверху, чтобы толстая линия на пике не обрезалась. */
const top = computed(() => LINE_WIDTH.line * props.unit);

const shapes = computed(() =>
  buildElevationShapes(profile.value.values, props.styleId, props.width, props.height, top.value),
);

const lineWidth = computed(() => {
  const id = props.styleId;
  return (id === 'line' || id === 'area' || id === 'steps' ? LINE_WIDTH[id] : 0) * props.unit;
});

const isRounded = computed(() => props.styleId === 'strokes' || props.styleId === 'wave');
</script>

<template>
  <g>
    <defs v-if="styleId === 'area'">
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="color" stop-opacity="0.55" />
        <stop offset="1" :stop-color="color" stop-opacity="0.04" />
      </linearGradient>
    </defs>

    <path v-if="styleId === 'area' && shapes.area" :d="shapes.area" :fill="`url(#${gradientId})`" />
    <path v-if="styleId === 'silhouette' && shapes.area" :d="shapes.area" :fill="color" />
    <path v-if="styleId === 'steps' && shapes.area" :d="shapes.area" :fill="color" opacity="0.22" />

    <path
      v-if="lineWidth && shapes.line"
      :d="shapes.line"
      fill="none"
      :stroke="color"
      :stroke-width="lineWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <rect
      v-for="(rect, index) in shapes.rects"
      :key="`r${index}`"
      :x="rect.x"
      :y="rect.y"
      :width="rect.width"
      :height="rect.height"
      :rx="isRounded ? rect.width / 2 : Math.min(rect.width / 4, 3 * unit)"
      :fill="color"
      :opacity="rect.faded ? 0.35 : 1"
    />

    <circle
      v-for="(dot, index) in shapes.dots"
      :key="`d${index}`"
      :cx="dot.cx"
      :cy="dot.cy"
      :r="dot.r"
      :fill="color"
    />
  </g>
</template>
