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
const LINE_WIDTH: Partial<Record<ShareElevationStyle, number>> = {
  line: 9,
  area: 7,
  steps: 6,
  glow: 7,
  gradient: 9,
  mountain: 6,
  ridges: 6,
  dashed: 7,
  contour: 6,
};
/** Сдвиги копий: «Хребты» — вбок (дальние горы), «Изолинии» — вниз. */
const RIDGE_SHIFTS = [
  { dx: 0.05, opacity: 0.25 },
  { dx: -0.035, opacity: 0.5 },
];
const CONTOUR_COPIES = [0.6, 0.4, 0.22];

/**
 * График высоты (SVG-фрагмент без обёртки): на карточке и в превью меню.
 * Размеры — в пикселях раскладки; `unit` — пикселей в единице слоя.
 */
const props = defineProps<{
  track: ITrackPoint[];
  styleId: ShareElevationStyle;
  color: string;
  /** Второй цвет (цвет текста карточки): «Градиент», вершины «Гор». */
  accentColor: string;
  width: number;
  height: number;
  unit: number;
}>();

// Уникальный id градиента: на странице одновременно график карточки и превью.
const id = useId();
const gradientId = `elevation-gradient-${id}`;
const strokeGradientId = `elevation-stroke-${id}`;

const profile = computed(() =>
  getElevationProfile(props.track, ELEVATION_STYLE_SAMPLES[props.styleId]),
);

/** Запас сверху, чтобы толстая линия (и ореол «Свечения») на пике не обрезались. */
const top = computed(() => (props.styleId === 'glow' ? 16 : 9) * props.unit);

const shapes = computed(() =>
  buildElevationShapes(profile.value.values, props.styleId, props.width, props.height, top.value),
);

const lineWidth = computed(() => (LINE_WIDTH[props.styleId] ?? 0) * props.unit);

const lineStroke = computed(() => {
  if (props.styleId === 'gradient') return `url(#${strokeGradientId})`;
  if (props.styleId === 'mountain') return props.accentColor;
  return props.color;
});

const isRounded = computed(() => ['strokes', 'wave', 'lollipop'].includes(props.styleId));

/** Заливка под линией: градиентом (вертикальным), сплошная или бледная. */
const hasFadeFill = computed(() => props.styleId === 'area' || props.styleId === 'gradient');
</script>

<template>
  <g>
    <defs v-if="hasFadeFill">
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="color" :stop-opacity="styleId === 'area' ? 0.55 : 0.25" />
        <stop offset="1" :stop-color="color" stop-opacity="0.04" />
      </linearGradient>
      <linearGradient
        v-if="styleId === 'gradient'"
        :id="strokeGradientId"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        :x2="width"
        y2="0"
      >
        <stop offset="0" :stop-color="color" />
        <stop offset="1" :stop-color="accentColor" />
      </linearGradient>
    </defs>

    <path v-if="hasFadeFill && shapes.area" :d="shapes.area" :fill="`url(#${gradientId})`" />
    <path
      v-if="(styleId === 'silhouette' || styleId === 'mountain') && shapes.area"
      :d="shapes.area"
      :fill="color"
    />
    <path v-if="styleId === 'steps' && shapes.area" :d="shapes.area" :fill="color" opacity="0.22" />
    <path
      v-if="styleId === 'dashed' && shapes.area"
      :d="shapes.area"
      :fill="color"
      opacity="0.12"
    />

    <template v-if="styleId === 'ridges' && shapes.area">
      <path
        v-for="(ridge, index) in RIDGE_SHIFTS"
        :key="index"
        :d="shapes.area"
        :fill="color"
        :opacity="ridge.opacity"
        :transform="`translate(${ridge.dx * width} 0)`"
      />
      <path :d="shapes.area" :fill="color" opacity="0.85" />
    </template>

    <!-- Ореол под линией «Свечения». -->
    <path
      v-if="styleId === 'glow' && shapes.line"
      :d="shapes.line"
      fill="none"
      :stroke="color"
      :stroke-width="lineWidth * 3.4"
      opacity="0.22"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- «Изолинии»: копии профиля ниже, всё бледнее. -->
    <template v-if="styleId === 'contour' && shapes.line">
      <path
        v-for="(opacity, index) in CONTOUR_COPIES"
        :key="index"
        :d="shapes.line"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.7"
        :opacity="opacity"
        :transform="`translate(0 ${(index + 1) * height * 0.13})`"
        stroke-linejoin="round"
      />
    </template>

    <path
      v-if="lineWidth && shapes.line"
      :d="shapes.line"
      fill="none"
      :stroke="lineStroke"
      :stroke-width="lineWidth"
      :stroke-dasharray="styleId === 'dashed' ? `${16 * unit} ${11 * unit}` : undefined"
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
