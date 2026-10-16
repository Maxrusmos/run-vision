<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_ROUTE_STYLES } from '@/entities/activity/model/activity-share/activity-share-route-styles';
import { projectRoute, toSvgPolylinePoints } from '@/entities/activity/lib/route-projection';
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
}>();

// Точки относительно центра превью — так же, как у трека на карточке.
const localPoints = computed(() =>
  projectRoute(props.track, PREVIEW).map((point) => ({
    x: point.x - PREVIEW.width / 2,
    y: point.y - PREVIEW.height / 2,
  })),
);
const points = computed(() => toSvgPolylinePoints(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);
const viewBox = `${-PREVIEW.width / 2} ${-PREVIEW.height / 2} ${PREVIEW.width} ${PREVIEW.height}`;
</script>

<template>
  <OptionTileRow>
    <ColorOptionTile
      label="Цвет"
      input-label="Цвет трека"
      :color="settings.routeColor"
      @change="emit('setRouteColor', $event)"
    />

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
</template>

<style scoped>
.track-preview {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
