<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { ShareElevationSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ELEVATION_SERIES_SAMPLES,
  getElevationProfile,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';
import ProfileChart from '@/views/photo-editor-view/components/artwork/ProfileChart.vue';

const props = defineProps<{
  track: ITrackPoint[];
  settings: ShareElevationSettings;
  color: string;
  textColor: string;
  selected: boolean;
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
}
</style>
