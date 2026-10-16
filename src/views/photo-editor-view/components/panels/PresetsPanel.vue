<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_COLOR_PRESETS } from '@/entities/activity/model/activity-share/activity-share-presets';
import ShareColorPresetCard from '@/views/photo-editor-view/components/settings/ShareColorPresetCard.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  applyPreset: [id: string];
}>();
</script>

<template>
  <!-- Горизонтальная карусель: свайп по пресетам, карточка над ней сразу меняется. -->
  <div class="presets-carousel">
    <ShareColorPresetCard
      v-for="preset in SHARE_COLOR_PRESETS"
      :key="preset.id"
      class="presets-carousel__item"
      :preset="preset"
      :active="settings.presetId === preset.id"
      :transparent="settings.transparentBackground"
      :background-image="settings.backgroundImage"
      :background-image-fit="settings.backgroundImageFit"
      :background-image-position="settings.backgroundImagePosition"
      @select="emit('applyPreset', preset.id)"
    />
  </div>
</template>

<style scoped>
.presets-carousel {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 2px 16px 6px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.presets-carousel::-webkit-scrollbar {
  display: none;
}

.presets-carousel__item {
  flex: 0 0 104px;
  scroll-snap-align: start;
}
</style>
