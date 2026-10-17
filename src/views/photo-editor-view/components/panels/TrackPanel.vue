<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareRoutePitch,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_ROUTE_STYLES } from '@/entities/activity/model/activity-share/activity-share-route-styles';
import { SHARE_ROUTE_PITCHES } from '@/entities/activity/model/activity-share/activity-share-map';
import {
  orientRoute,
  projectRoute,
  toSvgPolylinePoints,
} from '@/entities/activity/lib/route-projection';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';
import ToggleGroup from '@/views/photo-editor-view/components/settings/ToggleGroup.vue';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';

/** Превью трека в плитке: размер области и масштаб эффектов. */
const PREVIEW = { width: 70, height: 46, padding: 9 };
/** Эффекты в превью крупнее пропорции карточки, иначе сдвиги копий не разглядеть. */
const PREVIEW_UNIT = 0.22;
/**
 * Точек трека в превью: плитка крошечная, а 16 плиток с полным треком (десятки тысяч
 * точек) перерисовывались на каждом шаге поворота — меню заметно подлагивало.
 */
const PREVIEW_POINTS = 200;

const props = defineProps<{
  settings: ShareCardSettings;
  track: ITrackPoint[];
}>();

const emit = defineEmits<{
  setRouteColor: [color: string];
  setRouteStyle: [style: ShareRouteStyle];
  setRouteBearing: [bearing: number];
  setRoutePitch: [pitch: ShareRoutePitch];
  setRouteFlags: [value: boolean];
}>();

/** Флажки на треке — одной кнопкой: отметки километров, старт и финиш. */
const flagOptions = computed(() => [
  {
    key: 'flags',
    icon: 'mdi-flag-checkered',
    title: props.settings.routeFlags ? 'Убрать флажки' : 'Флажки: километры и финиш',
    active: props.settings.routeFlags,
  },
]);

const pitch = computed({
  get: () => props.settings.routePitch,
  set: (value: ShareRoutePitch) => emit('setRoutePitch', value),
});
const pitchOptions = SHARE_ROUTE_PITCHES.map((value) => ({
  value,
  label: `${value}°`,
  title: value ? `Наклон ${value}°` : 'Без наклона',
}));

// Точки относительно центра превью — так же, как у трека на карточке (с поворотом и наклоном).
const flatPoints = computed(() => {
  const stride = Math.max(1, Math.floor(props.track.length / PREVIEW_POINTS));
  const sample = props.track.filter(
    (_, index) => index % stride === 0 || index === props.track.length - 1,
  );
  return projectRoute(sample, PREVIEW).map((point) => ({
    x: point.x - PREVIEW.width / 2,
    y: point.y - PREVIEW.height / 2,
  }));
});
const localPoints = computed(() =>
  orientRoute(
    flatPoints.value,
    { bearing: props.settings.routeBearing, pitch: props.settings.routePitch },
    PREVIEW,
  ),
);
const points = computed(() => toSvgPolylinePoints(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);
const viewBox = `${-PREVIEW.width / 2} ${-PREVIEW.height / 2} ${PREVIEW.width} ${PREVIEW.height}`;
</script>

<template>
  <div class="track-panel">
    <!-- Наклон, флажки и поворот — для всех шаблонов (с картой — заодно и карты).
         На карточке поворот — двумя пальцами. -->
    <div class="track-panel__controls">
      <SegmentedGroup v-model="pitch" :options="pitchOptions" group-label="Наклон трека" grow />
      <ToggleGroup
        :options="flagOptions"
        group-label="Флажки на треке"
        @toggle="emit('setRouteFlags', !settings.routeFlags)"
      />
    </div>

    <!-- Поворот — такой же ползунок, как перемотка видео; края — по линии рядов выше и ниже. -->
    <div class="track-panel__rotation">
      <v-icon
        class="track-panel__rotation-icon"
        icon="mdi-rotate-3d-variant"
        size="20"
        aria-hidden="true"
      />
      <v-slider
        class="track-panel__range"
        :model-value="settings.routeBearing"
        :min="0"
        :max="355"
        :step="5"
        color="primary"
        track-color="rgb(var(--v-theme-on-surface))"
        thumb-size="14"
        track-size="4"
        hide-details
        density="compact"
        aria-label="Поворот трека"
        @update:model-value="emit('setRouteBearing', Number($event))"
      />
      <span class="track-panel__bearing">{{ settings.routeBearing }}°</span>
      <button
        type="button"
        class="track-panel__reset"
        :disabled="!settings.routeBearing"
        aria-label="Север сверху"
        title="Север сверху"
        @click="emit('setRouteBearing', 0)"
      >
        <v-icon
          icon="mdi-navigation-variant"
          size="20"
          :style="{ transform: `rotate(${-settings.routeBearing}deg)` }"
        />
      </button>
    </div>

    <OptionTileRow>
      <template #fixed>
        <ColorOptionTile
          label="Цвет"
          input-label="Цвет трека"
          :color="settings.routeColor"
          @change="emit('setRouteColor', $event)"
        />
      </template>

      <OptionTile
        v-for="style in SHARE_ROUTE_STYLES"
        :key="style.id"
        :label="style.name"
        :active="settings.routeStyle === style.id"
        @click="emit('setRouteStyle', style.id)"
      >
        <template #preview>
          <svg
            class="track-preview"
            :viewBox="viewBox"
            :style="{ background: settings.backgroundColor }"
            aria-hidden="true"
          >
            <RouteStyleLayers
              :points="points"
              :start="start"
              :style-id="style.id"
              :route-color="settings.routeColor"
              :text-color="settings.textColor"
              :background-color="settings.backgroundColor"
              :unit="PREVIEW_UNIT"
            />
          </svg>
        </template>
      </OptionTile>
    </OptionTileRow>
  </div>
</template>

<style scoped>
.track-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* Сверху кнопки, а не плитки: тот же отступ от «ручки», что у ряда плиток (8px). */
  padding-top: 8px;
}

.track-panel__controls {
  display: flex;
  gap: 8px;
}

.track-panel__rotation {
  display: flex;
  align-items: center;
  gap: 10px;
  /* Высота — как у кнопок выше; между рядами — те же 12px (gap 4px + 8px). */
  height: 36px;
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
}

/* Иконка — по центру той же ширины, что и кнопка «Север сверху» справа: ряд симметричен. */
.track-panel__rotation-icon {
  flex: 0 0 40px;
}

.track-panel__range {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

/* Значение — по центру ячейки той же ширины, что у иконки слева: отступы от дорожки равны. */
.track-panel__bearing {
  flex: 0 0 40px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* Как кнопка флажков над ней: та же ширина и скругление, правые края на одной линии. */
.track-panel__reset {
  display: grid;
  flex: 0 0 40px;
  height: 36px;
  place-items: center;
  padding: 0;
  color: var(--app-primary);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.track-panel__reset:disabled {
  color: inherit;
  cursor: default;
  opacity: 0.4;
}

.track-preview {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
