<script setup lang="ts">
import type {
  ShareMapBase,
  ShareMapLayout,
  ShareMapSettings,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_MAP_BASES,
  SHARE_MAP_LAYOUTS,
} from '@/entities/activity/model/activity-share/activity-share-map';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';

defineProps<{
  map: ShareMapSettings;
}>();

const emit = defineEmits<{
  setLayout: [layout: ShareMapLayout];
  setBase: [base: ShareMapBase];
  setTilted: [value: boolean];
}>();
</script>

<template>
  <div class="map-panel">
    <!-- Вид карточки и наклон. -->
    <OptionTileRow>
      <template #fixed>
        <OptionTile
          v-for="layout in SHARE_MAP_LAYOUTS"
          :key="layout.id"
          :label="layout.name"
          :active="map.layout === layout.id"
          @click="emit('setLayout', layout.id)"
        >
          <template #preview>
            <span class="map-panel__layout" :class="`map-panel__layout--${layout.id}`">
              <span class="map-panel__layout-map" />
              <span class="map-panel__layout-stats" />
            </span>
          </template>
        </OptionTile>
      </template>

      <OptionTile label="Наклон 3D" :active="map.tilted" @click="emit('setTilted', !map.tilted)">
        <template #preview><v-icon icon="mdi-angle-acute" size="22" /></template>
      </OptionTile>
    </OptionTileRow>

    <!-- Подложка. -->
    <OptionTileRow>
      <OptionTile
        v-for="base in SHARE_MAP_BASES"
        :key="base.id"
        :label="base.name"
        :active="map.base === base.id"
        @click="emit('setBase', base.id)"
      >
        <template #preview>
          <span class="map-panel__base" :style="{ background: base.preview }" />
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

.map-panel__base {
  width: 100%;
  height: 100%;
}

/* Схема вида карточки: прямоугольник карты и полоса показателей. */
.map-panel__layout {
  position: relative;
  width: 30px;
  height: 38px;
  overflow: hidden;
  border: 1.5px solid currentcolor;
  border-radius: 4px;
}

.map-panel__layout-map {
  position: absolute;
  background: color-mix(in srgb, currentcolor 45%, transparent);
}

.map-panel__layout--block .map-panel__layout-map {
  inset: 3px 3px auto;
  height: 18px;
  border-radius: 2px;
}

.map-panel__layout--full .map-panel__layout-map {
  inset: 0;
}

.map-panel__layout-stats {
  position: absolute;
  right: 3px;
  bottom: 3px;
  left: 3px;
  height: 8px;
  border-radius: 2px;
  background: currentcolor;
}
</style>
