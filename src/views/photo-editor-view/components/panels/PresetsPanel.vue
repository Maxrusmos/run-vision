<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  PRO_COLOR_PRESETS,
  SHARE_COLOR_PRESETS,
} from '@/entities/activity/model/activity-share/activity-share-presets';
import ProTileBadge from '@/views/photo-editor-view/components/settings/ProTileBadge.vue';
import CardDecor from '@/views/photo-editor-view/components/artwork/CardDecor.vue';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  applyPreset: [id: string];
}>();

// Все пресеты: сначала обычные, за ними Pro-оформления (с короной на плитке).
const PRESETS = [...SHARE_COLOR_PRESETS, ...PRO_COLOR_PRESETS];
</script>

<template>
  <OptionTileRow>
    <OptionTile
      v-for="preset in PRESETS"
      :key="preset.id"
      :label="preset.name"
      :active="settings.presetId === preset.id"
      @click="emit('applyPreset', preset.id)"
    >
      <!-- Мини-карточка в цветах пресета (поверх фото или прозрачности, если они включены). -->
      <template #preview>
        <span
          class="preset-preview"
          :class="{ checkerboard: settings.transparentBackground && !settings.backgroundImage }"
          :style="{
            backgroundColor:
              settings.backgroundImage || settings.transparentBackground
                ? undefined
                : preset.background,
          }"
        >
          <CardDecor
            v-if="preset.decor && !settings.backgroundImage && !settings.transparentBackground"
            :decor="preset.decor"
            :scale="0.45"
          />
          <img
            v-if="settings.backgroundImage"
            class="preset-preview__image"
            :src="settings.backgroundImage"
            alt=""
          />
          <span class="preset-preview__line" :style="{ backgroundColor: preset.route }" />
          <span class="preset-preview__dot" :style="{ backgroundColor: preset.text }" />
          <ProTileBadge v-if="preset.pro" />
        </span>
      </template>
    </OptionTile>
  </OptionTileRow>
</template>

<style scoped>
.preset-preview {
  --checkerboard-size: 12px;

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.preset-preview__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-preview__line {
  position: relative;
  width: 56%;
  height: 4px;
  border-radius: 4px;
  transform: rotate(-20deg);
}

.preset-preview__dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>
