<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import SettingsPanel from '@/shared/ui/SettingsPanel.vue';
import StatSpacingSetting from '@/views/photo-editor-view/components/settings/StatSpacingSetting.vue';
import StatBordersToggle from '@/views/photo-editor-view/components/settings/StatBordersToggle.vue';
import TransparentBackgroundToggle from '@/views/photo-editor-view/components/settings/TransparentBackgroundToggle.vue';
import BackgroundImageSetting from '@/views/photo-editor-view/components/settings/BackgroundImageSetting.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setStatSpacing: [value: number];
  setShowStatBorders: [value: boolean];
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
}>();
</script>

<template>
  <SettingsPanel title="Настройки карточки" icon="mdi-tune-variant">
    <div class="appearance-settings">
      <StatSpacingSetting
        :model-value="settings.statSpacing"
        @update:model-value="emit('setStatSpacing', $event)"
      />
      <StatBordersToggle
        :model-value="settings.showStatBorders"
        @update:model-value="emit('setShowStatBorders', $event)"
      />
      <TransparentBackgroundToggle
        :model-value="settings.transparentBackground"
        :disabled="Boolean(settings.backgroundImage)"
        @update:model-value="emit('setTransparentBackground', $event)"
      />
      <BackgroundImageSetting
        :has-image="Boolean(settings.backgroundImage)"
        @upload="emit('setBackgroundImage', $event)"
        @remove="emit('removeBackgroundImage')"
      />
    </div>
  </SettingsPanel>
</template>

<style scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
</style>
