<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareMapPitch,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_ROUTE_STYLES } from '@/entities/activity/model/activity-share/activity-share-route-styles';
import { SHARE_MAP_PITCHES } from '@/entities/activity/model/activity-share/activity-share-map';
import {
  orientRoute,
  projectRoute,
  toSvgPolylinePoints,
} from '@/entities/activity/lib/route-projection';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';

/** Превью трека в плитке: размер области и масштаб эффектов. */
const PREVIEW = { width: 70, height: 46, padding: 9 };
/** Эффекты в превью крупнее пропорции карточки, иначе сдвиги копий не разглядеть. */
const PREVIEW_UNIT = 0.22;

const props = defineProps<{
  settings: ShareCardSettings;
  track: ITrackPoint[];
}>();

const emit = defineEmits<{
  setRouteColor: [color: string];
  setRouteStyle: [style: ShareRouteStyle];
  setRouteBearing: [bearing: number];
  setRoutePitch: [pitch: ShareMapPitch];
}>();

/** Свой поворот и наклон — только у трека без карты (у карты они в меню «Карта»). */
const orientable = computed(() => !props.settings.map);

const pitch = computed({
  get: () => props.settings.routePitch,
  set: (value: ShareMapPitch) => emit('setRoutePitch', value),
});
const pitchOptions = SHARE_MAP_PITCHES.map((value) => ({
  value,
  label: `${value}°`,
  title: value ? `Наклон ${value}°` : 'Без наклона',
}));

function handleBearingInput(event: Event) {
  emit('setRouteBearing', Number((event.target as HTMLInputElement).value));
}

// Точки относительно центра превью — так же, как у трека на карточке (с поворотом и наклоном).
const flatPoints = computed(() =>
  projectRoute(props.track, PREVIEW).map((point) => ({
    x: point.x - PREVIEW.width / 2,
    y: point.y - PREVIEW.height / 2,
  })),
);
const localPoints = computed(() =>
  orientable.value
    ? orientRoute(
        flatPoints.value,
        { bearing: props.settings.routeBearing, pitch: props.settings.routePitch },
        PREVIEW,
      )
    : flatPoints.value,
);
const points = computed(() => toSvgPolylinePoints(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);
const viewBox = `${-PREVIEW.width / 2} ${-PREVIEW.height / 2} ${PREVIEW.width} ${PREVIEW.height}`;
</script>

<template>
  <div class="track-panel">
    <!-- Наклон и поворот трека — одной строкой над стилями. На карточке — двумя пальцами. -->
    <div v-if="orientable" class="track-panel__orientation">
      <SegmentedGroup v-model="pitch" :options="pitchOptions" group-label="Наклон трека" />
      <input
        class="track-panel__range"
        type="range"
        min="0"
        max="355"
        step="5"
        :value="settings.routeBearing"
        aria-label="Поворот трека"
        @input="handleBearingInput"
      />
      <span class="track-panel__bearing">{{ settings.routeBearing }}°</span>
      <button
        type="button"
        class="track-panel__reset"
        :disabled="!settings.routeBearing"
        aria-label="Без поворота"
        title="Без поворота"
        @click="emit('setRouteBearing', 0)"
      >
        <v-icon
          icon="mdi-navigation-variant"
          size="18"
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
.track-panel__orientation {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
}

.track-panel__range {
  flex: 1 1 auto;
  min-width: 0;
  accent-color: var(--app-primary);
}

.track-panel__bearing {
  min-width: 34px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.track-panel__reset {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  color: var(--app-primary);
  border: 1px solid var(--app-border);
  border-radius: 8px;
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
