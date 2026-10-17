<script setup lang="ts">
import {
  VIDEO_CHART_MARKER,
  type ChartMarker,
} from '@/entities/activity/model/activity-share/activity-share-video';
import VideoDotMark from '@/views/photo-editor-view/components/artwork/VideoDotMark.vue';

/**
 * Видео: маркер на графике — черта поперёк и точка на линии (SVG-фрагмент). Те же
 * размеры рисует холст в кадрах видео (`drawChartMarker`).
 */
defineProps<{
  marker: ChartMarker;
  color: string;
  ringColor: string;
  /** Пикселей SVG в единице слоя трека. */
  unit: number;
}>();
</script>

<template>
  <g aria-hidden="true">
    <line
      :x1="marker.from.x"
      :y1="marker.from.y"
      :x2="marker.to.x"
      :y2="marker.to.y"
      :stroke="ringColor"
      :stroke-width="VIDEO_CHART_MARKER.line * unit"
      :opacity="VIDEO_CHART_MARKER.lineOpacity"
    />
    <VideoDotMark
      :x="marker.x"
      :y="marker.y"
      :route-color="color"
      :ring-color="ringColor"
      :unit="unit"
      size="chart"
    />
  </g>
</template>
