<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import ShareCardAppearanceSettings from '@/views/photo-editor-view/components/settings/ShareCardAppearanceSettings.vue';
import ShareColorPresets from '@/views/photo-editor-view/components/settings/ShareColorPresets.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setStatSpacing: [value: number];
  setShowStatBorders: [value: boolean];
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
  setRouteBehindStats: [value: boolean];
  applyPreset: [id: string];
}>();
</script>

<template>
  <aside class="editor-sidebar">
    <ShareCardAppearanceSettings
      :settings="settings"
      @set-stat-spacing="emit('setStatSpacing', $event)"
      @set-show-stat-borders="emit('setShowStatBorders', $event)"
      @set-transparent-background="emit('setTransparentBackground', $event)"
      @set-background-image="emit('setBackgroundImage', $event)"
      @remove-background-image="emit('removeBackgroundImage')"
      @set-route-behind-stats="emit('setRouteBehindStats', $event)"
    />
    <ShareColorPresets :settings="settings" @apply-preset="emit('applyPreset', $event)" />
  </aside>
</template>

<style scoped>
.editor-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
</style>
