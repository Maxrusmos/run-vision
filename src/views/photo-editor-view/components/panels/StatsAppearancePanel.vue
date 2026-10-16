<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import StatSpacingSetting from '@/views/photo-editor-view/components/settings/StatSpacingSetting.vue';
import StatBordersToggle from '@/views/photo-editor-view/components/settings/StatBordersToggle.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setStatSpacing: [value: number];
  setShowStatBorders: [value: boolean];
}>();
</script>

<template>
  <!-- Внешний вид показателей. Сюда же позже добавятся пресеты оформления показателей. -->
  <div class="stats-appearance-panel">
    <StatSpacingSetting
      :model-value="settings.statSpacing"
      @update:model-value="emit('setStatSpacing', $event)"
    />
    <StatBordersToggle
      :model-value="settings.showStatBorders"
      @update:model-value="emit('setShowStatBorders', $event)"
    />
  </div>
</template>

<style scoped>
.stats-appearance-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
