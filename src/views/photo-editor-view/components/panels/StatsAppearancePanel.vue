<script setup lang="ts">
import { computed } from 'vue';
import type {
  ShareCardSettings,
  ShareStatStyle,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { DEFAULT_SHARE_STAT_WIDTH } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import StatColumnsSetting from '@/views/photo-editor-view/components/settings/StatColumnsSetting.vue';
import StatStylePresets from '@/views/photo-editor-view/components/settings/StatStylePresets.vue';
import StatSpacingSetting from '@/views/photo-editor-view/components/settings/StatSpacingSetting.vue';
import StatBordersToggle from '@/views/photo-editor-view/components/settings/StatBordersToggle.vue';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setStatColumns: [width: ShareStatWidth];
  setStatStyle: [style: ShareStatStyle];
  setStatSpacing: [value: number];
  setShowStatBorders: [value: boolean];
}>();

const widths = computed(() =>
  props.settings.visibleStats.map(
    (key) => props.settings.statWidths[key] ?? DEFAULT_SHARE_STAT_WIDTH,
  ),
);
</script>

<template>
  <div class="stats-panel">
    <section class="stats-panel__section">
      <h3 class="stats-panel__title">Сетка</h3>
      <StatColumnsSetting :widths="widths" @select="emit('setStatColumns', $event)" />
    </section>

    <section class="stats-panel__section">
      <h3 class="stats-panel__title">Стиль</h3>
      <StatStylePresets :settings="settings" @select="emit('setStatStyle', $event)" />
    </section>

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
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-panel__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-panel__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}
</style>
