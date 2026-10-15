<script setup lang="ts">
import { computed } from 'vue';
import type { ShareStatKey } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

const props = defineProps<{
  visibleStats: ShareStatKey[];
}>();

const emit = defineEmits<{
  add: [key: ShareStatKey];
}>();

const availableOptions = computed(() =>
  SHARE_STAT_OPTIONS.filter((option) => !props.visibleStats.includes(option.key)),
);
</script>

<template>
  <v-menu
    v-if="availableOptions.length"
    location="bottom"
    origin="top"
    :close-on-content-click="false"
    location-strategy="connected"
    scroll-strategy="reposition"
  >
    <template #activator="{ props: menuProps }">
      <button v-bind="menuProps" class="stat-add" type="button">
        <v-icon icon="mdi-plus" size="small" />
        <span>Добавить показатели</span>
      </button>
    </template>

    <v-list density="compact" max-height="280">
      <v-list-item
        v-for="option in availableOptions"
        :key="option.key"
        :title="option.label"
        prepend-icon="mdi-plus"
        @click="emit('add', option.key)"
      />
    </v-list>
  </v-menu>
</template>

<style scoped>
.stat-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  color: var(--app-on-surface);
  background: color-mix(in srgb, #fff 7%, transparent);
  border: 1px dashed rgb(255 255 255 / 35%);
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.stat-add:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
</style>
