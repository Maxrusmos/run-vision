<script setup lang="ts">
import { computed } from 'vue';
import {
  VIDEO_DOT,
  VIDEO_ELEVATION_MARKER,
} from '@/entities/activity/model/activity-share/activity-share-video';

/**
 * Видео: точка на треке (или поменьше — на графике высоты), SVG-фрагмент. Те же размеры
 * рисует холст в кадрах видео (`drawVideoDot` / `drawElevationMarker`).
 */
const props = defineProps<{
  x: number;
  y: number;
  routeColor: string;
  ringColor: string;
  /** Пикселей SVG в единице слоя трека. */
  unit: number;
  size?: 'route' | 'elevation';
}>();

const dot = computed(() =>
  props.size === 'elevation'
    ? {
        radius: VIDEO_ELEVATION_MARKER.radius,
        ring: VIDEO_ELEVATION_MARKER.ring,
        halo: VIDEO_ELEVATION_MARKER.halo,
      }
    : VIDEO_DOT,
);
</script>

<template>
  <g aria-hidden="true">
    <circle
      :cx="x"
      :cy="y"
      :r="dot.halo * unit"
      :fill="routeColor"
      :opacity="VIDEO_DOT.haloOpacity"
    />
    <circle :cx="x" :cy="y" :r="(dot.radius + dot.ring) * unit" :fill="ringColor" />
    <circle :cx="x" :cy="y" :r="dot.radius * unit" :fill="routeColor" />
  </g>
</template>
