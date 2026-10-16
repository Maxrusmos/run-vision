<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareElevationSize,
  ShareElevationStyle,
  ShareTelemetrySettings,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_ELEVATION_SIZES,
  SHARE_ELEVATION_STYLES,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import {
  getPaceSeries,
  normalizeSeries,
} from '@/entities/activity/model/activity-share/activity-share-telemetry';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';
import ToggleGroup from '@/views/photo-editor-view/components/settings/ToggleGroup.vue';
import ProfileChart from '@/views/photo-editor-view/components/artwork/ProfileChart.vue';

/** Превью графика в плитке: размер и масштаб линий (крупнее пропорции карточки). */
const PREVIEW = { width: 64, height: 34, unit: 0.22 };

const props = defineProps<{
  telemetry: ShareTelemetrySettings;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  track: ITrackPoint[];
}>();

const emit = defineEmits<{
  setSize: [size: ShareElevationSize];
  setChartStyle: [style: ShareElevationStyle];
  /** null — цвет трека. */
  setColor: [color: string | null];
  setLabels: [value: boolean];
  setGrid: [value: boolean];
}>();

const color = computed(() => props.telemetry.color ?? props.routeColor);

/** Превью стилей графиков — на темпе этой тренировки. */
const previewSeries = computed(() => {
  const pace = getPaceSeries(props.track);
  return pace ? normalizeSeries(pace.values, true) : [0.4, 0.6, 0.5, 0.8, 0.6];
});

const size = computed({
  get: () => props.telemetry.size,
  set: (value: ShareElevationSize) => emit('setSize', value),
});
const sizeOptions = SHARE_ELEVATION_SIZES.map((option) => ({
  value: option.id,
  label: option.label,
  title: `Высота виджетов: ${option.title.toLowerCase()}`,
}));

// Свой цвет выбирается плиткой «Цвет»; эта кнопка возвращает цвет трека.
const colorSource = computed({
  get: () => (props.telemetry.color ? 'own' : 'route'),
  set: () => emit('setColor', null),
});
const colorSourceOptions = [
  { value: 'route' as const, label: 'Цвет трека', title: 'Цвет виджетов как у трека' },
];

const toggles = computed(() => [
  {
    key: 'labels',
    label: 'Сводка',
    title: 'Сводка в заголовке виджета',
    active: props.telemetry.labels,
  },
  { key: 'grid', icon: 'mdi-grid', title: 'Сетка на фоне', active: props.telemetry.grid },
]);

function toggle(key: string) {
  if (key === 'labels') emit('setLabels', !props.telemetry.labels);
  else emit('setGrid', !props.telemetry.grid);
}
</script>

<template>
  <div class="widgets-panel">
    <div class="widgets-panel__controls">
      <SegmentedGroup v-model="size" :options="sizeOptions" group-label="Высота виджетов" />
      <SegmentedGroup
        v-model="colorSource"
        :options="colorSourceOptions"
        group-label="Цвет виджетов"
      />
      <ToggleGroup :options="toggles" group-label="Оформление виджетов" @toggle="toggle" />
    </div>

    <OptionTileRow>
      <template #fixed>
        <ColorOptionTile
          label="Цвет"
          input-label="Цвет виджетов"
          :color="color"
          @change="emit('setColor', $event)"
        />
      </template>

      <!-- Вид графиков темпа, пульса и высоты. Сами виджеты добавляются в «Добавить». -->
      <OptionTile
        v-for="style in SHARE_ELEVATION_STYLES"
        :key="style.id"
        :label="style.name"
        :active="telemetry.chartStyle === style.id"
        @click="emit('setChartStyle', style.id)"
      >
        <template #preview>
          <svg
            class="widgets-panel__preview"
            :viewBox="`0 0 ${PREVIEW.width} ${PREVIEW.height}`"
            :style="{ background: backgroundColor }"
            aria-hidden="true"
          >
            <ProfileChart
              :series="previewSeries"
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
.widgets-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.widgets-panel__controls {
  display: flex;
  gap: 8px;
}

.widgets-panel__preview {
  display: block;
  width: 100%;
  height: 100%;
  padding: 6px 4px 4px;
  box-sizing: border-box;
}
</style>
