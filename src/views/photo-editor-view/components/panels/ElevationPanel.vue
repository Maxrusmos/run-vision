<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareElevationSettings,
  ShareElevationSize,
  ShareElevationStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ELEVATION_SERIES_SAMPLES,
  SHARE_ELEVATION_SIZES,
  SHARE_ELEVATION_STYLES,
  getElevationProfile,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';
import ProfileChart from '@/views/photo-editor-view/components/artwork/ProfileChart.vue';

/** Превью графика в плитке: размер и масштаб линий (крупнее пропорции карточки). */
const PREVIEW = { width: 64, height: 34, unit: 0.22 };

const props = defineProps<{
  elevation: ShareElevationSettings;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  track: ITrackPoint[];
}>();

const emit = defineEmits<{
  setStyle: [style: ShareElevationStyle];
  setSize: [size: ShareElevationSize];
  setLabels: [value: boolean];
  /** null — цвет трека. */
  setColor: [color: string | null];
}>();

const series = computed(() => getElevationProfile(props.track, ELEVATION_SERIES_SAMPLES).values);

const color = computed(() => props.elevation.color ?? props.routeColor);

const size = computed({
  get: () => props.elevation.size,
  set: (value: ShareElevationSize) => emit('setSize', value),
});
const sizeOptions = SHARE_ELEVATION_SIZES.map((option) => ({
  value: option.id,
  label: option.label,
  title: `Высота графика: ${option.title.toLowerCase()}`,
}));

// Свой цвет выбирается плиткой «Цвет»; эта кнопка возвращает цвет трека.
const colorSource = computed({
  get: () => (props.elevation.color ? 'own' : 'route'),
  set: () => emit('setColor', null),
});
const colorSourceOptions = [
  { value: 'route' as const, label: 'Цвет трека', title: 'Цвет графика как у трека' },
];

const labels = computed({
  get: () => (props.elevation.labels ? 'on' : 'off'),
  set: (value: 'on' | 'off') => emit('setLabels', value === 'on'),
});
const labelOptions = [
  { value: 'on' as const, label: 'Подписи', title: 'Показывать высоту и набор' },
  { value: 'off' as const, label: 'Без', title: 'Без подписей' },
];
</script>

<template>
  <div class="elevation-panel">
    <div class="elevation-panel__controls">
      <SegmentedGroup v-model="size" :options="sizeOptions" group-label="Высота графика" />
      <SegmentedGroup
        v-model="colorSource"
        :options="colorSourceOptions"
        group-label="Цвет графика"
      />
      <SegmentedGroup v-model="labels" :options="labelOptions" group-label="Подписи" grow />
    </div>

    <OptionTileRow>
      <template #fixed>
        <ColorOptionTile
          label="Цвет"
          input-label="Цвет графика высоты"
          :color="color"
          @change="emit('setColor', $event)"
        />
      </template>

      <OptionTile
        v-for="style in SHARE_ELEVATION_STYLES"
        :key="style.id"
        :label="style.name"
        :active="elevation.style === style.id"
        @click="emit('setStyle', style.id)"
      >
        <template #preview>
          <svg
            class="elevation-panel__preview"
            :viewBox="`0 0 ${PREVIEW.width} ${PREVIEW.height}`"
            :style="{ background: backgroundColor }"
            aria-hidden="true"
          >
            <ProfileChart
              :series="series"
              :style-id="style.id"
              :color="color"
              :accent-color="textColor"
              :width="PREVIEW.width"
              :height="PREVIEW.height"
              :unit="PREVIEW.unit"
            />
          </svg>
        </template>
      </OptionTile>
    </OptionTileRow>
  </div>
</template>

<style scoped>
.elevation-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elevation-panel__controls {
  display: flex;
  gap: 8px;
}

.elevation-panel__preview {
  display: block;
  width: 100%;
  height: 100%;
  padding: 6px 4px 4px;
  box-sizing: border-box;
}
</style>
