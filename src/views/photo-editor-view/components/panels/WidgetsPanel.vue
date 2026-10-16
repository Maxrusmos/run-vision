<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareElevationSize,
  ShareElevationStyle,
  ShareTelemetrySettings,
  ShareWidgetKind,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_ELEVATION_SIZES,
  SHARE_ELEVATION_STYLES,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import {
  getPaceSeries,
  normalizeSeries,
} from '@/entities/activity/model/activity-share/activity-share-telemetry';
import { SHARE_WIDGETS } from '@/entities/activity/model/activity-share/activity-share-widgets';
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
  toggleWidget: [kind: ShareWidgetKind, visible: boolean];
  setSize: [size: ShareElevationSize];
  setChartStyle: [style: ShareElevationStyle];
  /** null — цвет трека. */
  setColor: [color: string | null];
  setLabels: [value: boolean];
  setGrid: [value: boolean];
}>();

const color = computed(() => props.telemetry.color ?? props.routeColor);
const hasHeartRate = computed(() => props.track.some((point) => (point.heartRate ?? 0) > 0));

/** Превью стилей графиков — на темпе этой тренировки. */
const previewSeries = computed(() => {
  const pace = getPaceSeries(props.track);
  return pace ? normalizeSeries(pace.values, true) : [0.4, 0.6, 0.5, 0.8, 0.6];
});

function isOnCard(kind: ShareWidgetKind): boolean {
  return props.telemetry.widgets.some((widget) => widget.kind === kind);
}

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

      <!-- Виджеты: тап — добавить на карточку или убрать. -->
      <OptionTile
        v-for="widget in SHARE_WIDGETS"
        :key="widget.kind"
        :label="widget.name"
        :active="isOnCard(widget.kind)"
        :disabled="widget.needsHeartRate && !hasHeartRate"
        @click="emit('toggleWidget', widget.kind, !isOnCard(widget.kind))"
      >
        <template #preview>
          <span class="widgets-panel__widget" :style="{ color }">
            <v-icon :icon="widget.icon" size="22" />
            <v-icon
              class="widgets-panel__badge"
              :icon="isOnCard(widget.kind) ? 'mdi-check-circle' : 'mdi-plus-circle-outline'"
              size="14"
            />
          </span>
        </template>
      </OptionTile>

      <span class="widgets-panel__divider" aria-hidden="true" />

      <!-- Вид графиков темпа, пульса и высоты. -->
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

.widgets-panel__widget {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.widgets-panel__badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  color: var(--app-on-surface);
  opacity: 0.8;
}

.widgets-panel__divider {
  flex: 0 0 1px;
  align-self: stretch;
  background: var(--app-border);
}

.widgets-panel__preview {
  display: block;
  width: 100%;
  height: 100%;
  padding: 6px 4px 4px;
  box-sizing: border-box;
}
</style>
