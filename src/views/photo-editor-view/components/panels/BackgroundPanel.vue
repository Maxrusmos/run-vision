<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import TransparentBackgroundToggle from '@/views/photo-editor-view/components/settings/TransparentBackgroundToggle.vue';
import BackgroundImageSetting from '@/views/photo-editor-view/components/settings/BackgroundImageSetting.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
}>();
</script>

<template>
  <div class="background-panel">
    <BackgroundImageSetting
      :has-image="Boolean(settings.backgroundImage)"
      @upload="emit('setBackgroundImage', $event)"
      @remove="emit('removeBackgroundImage')"
    />
    <TransparentBackgroundToggle
      :model-value="settings.transparentBackground"
      :disabled="Boolean(settings.backgroundImage)"
      @update:model-value="emit('setTransparentBackground', $event)"
    />
    <p class="background-panel__hint">Цвет фона меняется пипеткой в углу карточки.</p>
  </div>
</template>

<style scoped>
.background-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.background-panel__hint {
  margin: 0;
  font-size: 11px;
  opacity: 0.6;
}
</style>
