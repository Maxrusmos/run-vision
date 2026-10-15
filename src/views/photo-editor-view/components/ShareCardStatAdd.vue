<script setup lang="ts">
import { computed } from 'vue';
import type { ShareStatKey } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_EMPTY_VALUE } from '@/entities/activity/model/activity-share/activity-share-stats';
import AddElementButton from '@/views/photo-editor-view/components/AddElementButton.vue';
import { SHARE_STAT_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

const props = defineProps<{
  visibleStats: ShareStatKey[];
  statValues: Record<ShareStatKey, string>;
}>();

const emit = defineEmits<{
  add: [key: ShareStatKey];
}>();

const availableOptions = computed(() =>
  SHARE_STAT_OPTIONS.filter((option) => !props.visibleStats.includes(option.key)).map((option) => ({
    ...option,
    value: props.statValues[option.key],
    // В GPX может не быть пульса, каденса или нужной дистанции.
    hasData: props.statValues[option.key] !== SHARE_STAT_EMPTY_VALUE,
  })),
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
      <AddElementButton v-bind="menuProps" label="Добавить показатели" />
    </template>

    <v-list density="compact" max-height="360">
      <v-list-item
        v-for="option in availableOptions"
        :key="option.key"
        :title="option.label"
        :subtitle="option.hasData ? option.value : 'Нет данных в GPX'"
        :disabled="!option.hasData"
        prepend-icon="mdi-plus"
        @click="emit('add', option.key)"
      />
    </v-list>
  </v-menu>
</template>
