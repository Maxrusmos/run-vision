<script setup lang="ts">
import { computed } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareMapLayout,
  ShareMapSettings,
  ShareMapStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_MAP_LAYOUTS,
  SHARE_MAP_STYLES,
  getLngLatBounds,
  getRouteLngLats,
  getShareMapBackground,
  getShareMapPreviewUrl,
  type ShareMapStyleOption,
} from '@/entities/activity/model/activity-share/activity-share-map';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';

const props = defineProps<{
  map: ShareMapSettings;
  settings: ShareCardSettings;
  track: ITrackPoint[];
}>();

const emit = defineEmits<{
  setLayout: [layout: ShareMapLayout];
  setStyle: [style: ShareMapStyle];
}>();

const layout = computed({
  get: () => props.map.layout,
  set: (value: ShareMapLayout) => emit('setLayout', value),
});

const layoutOptions = SHARE_MAP_LAYOUTS.map((option) => ({
  value: option.id,
  title: option.name,
}));

/** Центр тренировки — превью стилей показывают её место, а не абстрактную карту. */
const center = computed<[number, number]>(() => {
  const bounds = getLngLatBounds(getRouteLngLats(props.track));
  if (!bounds) return [37.62, 55.75];
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
});

/** Фон превью, пока тайл не загрузился (или если не загрузится). */
function previewBackground(style: ShareMapStyleOption): string {
  if (style.background) return getShareMapBackground(style, props.settings.backgroundColor);
  if (style.service.includes('Dark')) return '#2b2d30';
  if (style.service.includes('Imagery')) return '#3b4a33';
  return '#e4e4e1';
}

function hideBrokenImage(event: Event) {
  (event.target as HTMLImageElement).style.visibility = 'hidden';
}
</script>

<template>
  <div class="map-panel">
    <!-- Наклон, поворот и флажки — в меню «Трек»: здесь только вид карты. -->
    <SegmentedGroup v-model="layout" :options="layoutOptions" group-label="Вид карточки">
      <template #option="{ option }">
        <span class="map-panel__layout-option">
          <span class="map-panel__layout" :class="`map-panel__layout--${option.value}`">
            <span class="map-panel__layout-map" />
            <span class="map-panel__layout-stats" />
          </span>
          {{ option.title }}
        </span>
      </template>
    </SegmentedGroup>

    <OptionTileRow>
      <OptionTile
        v-for="style in SHARE_MAP_STYLES"
        :key="style.id"
        :label="style.name"
        :active="map.style === style.id"
        @click="emit('setStyle', style.id)"
      >
        <template #preview>
          <span class="map-panel__preview" :style="{ background: previewBackground(style) }">
            <img
              :src="getShareMapPreviewUrl(style, center)"
              alt=""
              loading="lazy"
              :style="{ filter: style.previewFilter, opacity: style.paint?.opacity ?? 1 }"
              @error="hideBrokenImage"
            />
          </span>
        </template>
      </OptionTile>
    </OptionTileRow>
  </div>
</template>

<style scoped>
.map-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-panel__preview {
  display: block;
  width: 100%;
  height: 100%;
}

.map-panel__preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-panel__layout-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Мини-схема вида карточки: карта и полоса показателей. */
.map-panel__layout {
  position: relative;
  width: 14px;
  height: 18px;
  overflow: hidden;
  border: 1.5px solid currentcolor;
  border-radius: 3px;
}

.map-panel__layout-map {
  position: absolute;
  background: color-mix(in srgb, currentcolor 45%, transparent);
}

.map-panel__layout--block .map-panel__layout-map {
  inset: 1.5px 1.5px auto;
  height: 8px;
  border-radius: 1px;
}

.map-panel__layout--full .map-panel__layout-map {
  inset: 0;
}

.map-panel__layout-stats {
  position: absolute;
  right: 1.5px;
  bottom: 1.5px;
  left: 1.5px;
  height: 3px;
  border-radius: 1px;
  background: currentcolor;
}
</style>
