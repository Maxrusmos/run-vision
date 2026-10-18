<script setup lang="ts">
import { computed, useId } from 'vue';
import type { ShareVideoDotSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  VIDEO_CHART_MARKER,
  VIDEO_DOT,
} from '@/entities/activity/model/activity-share/activity-share-video';
import {
  DEFAULT_VIDEO_DOT,
  getVideoDotLayers,
  type VideoDotLayer,
  type VideoDotPaints,
} from '@/entities/activity/model/activity-share/video-dot';

/**
 * Видео: точка на треке (по стилю или фото «пузырьком») или поменьше — на графике,
 * SVG-фрагмент. Те же слои рисует холст в кадрах видео (`drawVideoDotLayers` /
 * `drawChartMarker`).
 */
const props = defineProps<{
  x: number;
  y: number;
  /** Цвет точки (на графике — цвет графика). */
  routeColor: string;
  ringColor: string;
  /** Цвет фона карточки — у стилей с «просветом». */
  backgroundColor?: string;
  /** Пикселей SVG в единице слоя трека. */
  unit: number;
  size?: 'route' | 'chart';
  /** Стиль и фото точки на треке; без него — классика. */
  dot?: ShareVideoDotSettings;
}>();

const clipId = `video-dot-photo-${useId()}`;

const layers = computed<readonly VideoDotLayer[]>(() => {
  if (props.size !== 'chart') return getVideoDotLayers(props.dot ?? DEFAULT_VIDEO_DOT);
  const { radius, ring, halo } = VIDEO_CHART_MARKER;
  return [
    { kind: 'circle', cy: 0, r: halo, paint: 'dot', opacity: VIDEO_DOT.haloOpacity },
    { kind: 'circle', cy: 0, r: radius + ring, paint: 'ring' },
    { kind: 'circle', cy: 0, r: radius, paint: 'dot' },
  ];
});

const paints = computed<VideoDotPaints>(() => ({
  dot: props.routeColor,
  ring: props.ringColor,
  background: props.backgroundColor ?? props.ringColor,
}));

const polygonPoints = (points: readonly (readonly [number, number])[]) =>
  points.map(([px, py]) => `${props.x + px * props.unit},${props.y + py * props.unit}`).join(' ');
</script>

<template>
  <g aria-hidden="true">
    <template v-for="(layer, index) in layers" :key="index">
      <circle
        v-if="layer.kind === 'circle'"
        :cx="x"
        :cy="y + layer.cy * unit"
        :r="layer.r * unit"
        :fill="paints[layer.paint]"
        :opacity="layer.opacity"
      />
      <polygon
        v-else-if="layer.kind === 'polygon'"
        :points="polygonPoints(layer.points)"
        :fill="paints[layer.paint]"
      />
      <template v-else-if="dot?.photo">
        <clipPath :id="clipId">
          <circle :cx="x" :cy="y + layer.cy * unit" :r="layer.r * unit" />
        </clipPath>
        <!-- Как object-fit: cover — так же обрезает холст в кадрах видео. -->
        <image
          :href="dot.photo"
          :x="x - layer.r * unit"
          :y="y + (layer.cy - layer.r) * unit"
          :width="layer.r * 2 * unit"
          :height="layer.r * 2 * unit"
          preserveAspectRatio="xMidYMid slice"
          :clip-path="`url(#${clipId})`"
        />
      </template>
    </template>
  </g>
</template>
