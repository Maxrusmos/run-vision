<script setup lang="ts">
import type {
  ShareStatKey,
  ShareStatOption,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  options: ShareStatOption[];
  visibleStats: ShareStatKey[];
}>();

const emit = defineEmits<{
  add: [key: ShareStatKey];
}>();
</script>

<template>
  <v-menu location="top" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <button v-bind="menuProps" class="stat-add" type="button" aria-label="Добавить показатель">
        <v-icon icon="mdi-plus" size="small" />
        <span>Добавить показатель</span>
      </button>
    </template>

    <v-list density="compact" max-height="280" class="stat-add__list">
      <template
        v-for="option in options.filter((item) => !visibleStats.includes(item.key))"
        :key="option.key"
      >
        <v-list-item
          :title="option.label"
          prepend-icon="mdi-plus"
          @click="emit('add', option.key)"
        />
      </template>
      <div v-if="options.every((item) => visibleStats.includes(item.key))" class="stat-add__empty">
        Все показатели добавлены
      </div>
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

  color: var(--share-text, #fff);
  background: color-mix(in srgb, #fff 7%, transparent);
  border: 1px dashed rgb(255 255 255 / 35%);
  border-radius: 10px;

  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.stat-add__empty {
  padding: 12px 16px;
  color: rgba(var(--app-on-surface), 0.6);
  font-size: 14px;
  text-align: center;
  white-space: nowrap;
}
</style>
