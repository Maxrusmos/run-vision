<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    icon: string;
    /** Раскрыть панель при первом показе. */
    expanded?: boolean;
  }>(),
  { expanded: false },
);

const openPanels = ref<number[]>(props.expanded ? [0] : []);
</script>

<template>
  <v-expansion-panels variant="accordion" v-model="openPanels" multiple>
    <v-expansion-panel class="settings-panel" :value="0">
      <v-expansion-panel-title class="settings-panel__title">
        <v-icon :icon="icon" size="18" class="settings-panel__icon" />
        <span class="font-weight-bold">{{ title }}</span>
      </v-expansion-panel-title>

      <v-expansion-panel-text class="settings-panel__content">
        <slot />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.settings-panel {
  overflow: hidden;
  border-radius: 16px;
}

.settings-panel__title {
  min-height: 52px;
  padding: 12px 16px;
  font-size: 14px;
}

.settings-panel__icon {
  margin-inline-end: 8px;
}

.settings-panel__content :deep(.v-expansion-panel-text__wrapper) {
  padding: 12px 16px 16px;
}
</style>
