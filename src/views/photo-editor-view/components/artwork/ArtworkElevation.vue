<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { ShareElevationSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ELEVATION_SERIES_SAMPLES,
  ELEVATION_STYLE_SAMPLES,
  getElevationChartTop,
  getElevationMarker,
  getElevationProfile,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import { resampleSeries } from '@/entities/activity/model/activity-share/activity-share-telemetry';
import {
  VIDEO_ELEVATION_MARKER,
  type ElevationMarkerPoint,
} from '@/entities/activity/model/activity-share/activity-share-video';
import VideoDotMark from '@/views/photo-editor-view/components/artwork/VideoDotMark.vue';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';
import ProfileChart from '@/views/photo-editor-view/components/artwork/ProfileChart.vue';

const props = defineProps<{
  track: ITrackPoint[];
  settings: ShareElevationSettings;
  color: string;
  textColor: string;
  selected: boolean;
  /** Видео: точка на треке прошла эту долю дистанции — маркер на графике; null — фото. */
  progress?: number | null;
}>();

const emit = defineEmits<{
  select: [];
}>();

const profile = computed(() => getElevationProfile(props.track, ELEVATION_SERIES_SAMPLES));
const series = computed(() => profile.value.values);
const labels = computed(() => {
  if (!props.settings.labels || profile.value.flat) return null;
  const { min, max, gain } = profile.value;
  return {
    range: `${Math.round(min)}–${Math.round(max)} м`,
    gain: `↑ ${Math.round(gain)} м`,
  };
});

// Размер области графика в пикселях раскладки (карточка масштабируется transform).
const chartArea = useTemplateRef<HTMLElement>('chartArea');
const box = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const element = chartArea.value;
  if (!element) return;
  const measure = () => {
    box.value = { width: element.offsetWidth, height: element.offsetHeight };
  };
  measure();
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(element);
});

onBeforeUnmount(() => resizeObserver?.disconnect());

/** Единица слоя — от ширины всей карточки с отступами, как у трека. */
const unit = computed(() => (box.value.width + 32) / ROUTE_LAYER_WIDTH);

// Видео: маркер — на линии графика, по тому же ряду, что рисует стиль.
const styleValues = computed(() =>
  resampleSeries(series.value, ELEVATION_STYLE_SAMPLES[props.settings.style]),
);

/** Где маркер для доли `progress` дистанции — в пикселях области графика. */
function getMarker(progress: number): ElevationMarkerPoint {
  const { width, height } = box.value;
  const top = getElevationChartTop(props.settings.style, unit.value);
  const point = getElevationMarker(styleValues.value, progress, width, height, top);
  return { ...point, top: 0, bottom: height };
}

const marker = computed(() =>
  props.progress === null || props.progress === undefined || !box.value.width
    ? null
    : getMarker(props.progress),
);

defineExpose({
  /** Область графика: её размер на экране переводит пиксели графика в пиксели карточки. */
  getChartElement: () => chartArea.value,
  getMarker,
  getUnit: () => unit.value,
});
</script>

<template>
  <div
    class="artwork-elevation"
    :class="{ 'artwork-elevation--selected': selected }"
    data-selectable
    @click="emit('select')"
  >
    <SelectionFrame v-if="selected" />

    <div v-if="labels" class="artwork-elevation__labels">
      <span>{{ labels.range }}</span>
      <span>{{ labels.gain }}</span>
    </div>

    <div ref="chartArea" class="artwork-elevation__chart">
      <svg
        v-if="box.width && box.height"
        :viewBox="`0 0 ${box.width} ${box.height}`"
        :width="box.width"
        :height="box.height"
        aria-hidden="true"
      >
        <ProfileChart
          :series="series"
          :style-id="settings.style"
          :color="color"
          :accent-color="textColor"
          :width="box.width"
          :height="box.height"
          :unit="unit"
        />
        <!-- Видео: где сейчас точка трека (в кадры видео маркер рисует холст). -->
        <g v-if="marker">
          <rect
            :x="marker.x - (VIDEO_ELEVATION_MARKER.line * unit) / 2"
            :y="marker.top"
            :width="VIDEO_ELEVATION_MARKER.line * unit"
            :height="marker.bottom - marker.top"
            :fill="textColor"
            :opacity="VIDEO_ELEVATION_MARKER.lineOpacity"
          />
          <VideoDotMark
            :x="marker.x"
            :y="marker.y"
            :route-color="color"
            :ring-color="textColor"
            :unit="unit"
            size="elevation"
          />
        </g>
      </svg>
    </div>

    <!-- Размер — только в меню «График»; здесь — удаление. -->
  </div>
</template>

<style scoped>
.artwork-elevation {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: auto;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.artwork-elevation__labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  opacity: 0.8;
}

.artwork-elevation__chart {
  flex: 1 1 0;
  min-height: 0;
}

.artwork-elevation__chart svg {
  display: block;
  /* Маркер видео у края графика не обрезается — как и в кадрах видео (холст). */
  overflow: visible;
}
</style>
