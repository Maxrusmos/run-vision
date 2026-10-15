<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_COLOR_PRESETS } from '@/entities/activity/model/activity-share/activity-share-presets';
import SettingsPanel from '@/shared/ui/SettingsPanel.vue';
import ShareColorPresetCard from '@/views/photo-editor-view/components/settings/ShareColorPresetCard.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  applyPreset: [id: string];
}>();
</script>

<template>
  <SettingsPanel title="Оформление" icon="mdi-palette-outline">
    <div class="preset-grid">
      <ShareColorPresetCard
        v-for="preset in SHARE_COLOR_PRESETS"
        :key="preset.id"
        :preset="preset"
        :active="settings.presetId === preset.id"
        :transparent="settings.transparentBackground"
        :background-image="settings.backgroundImage"
        :background-image-fit="settings.backgroundImageFit"
        :background-image-position="settings.backgroundImagePosition"
        @select="emit('applyPreset', preset.id)"
      />
    </div>
  </SettingsPanel>
</template>

<style scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
</style>
