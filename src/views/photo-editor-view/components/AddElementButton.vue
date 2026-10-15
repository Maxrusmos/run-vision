<script setup lang="ts">
defineProps<{
  label: string;
  icon?: string;
}>();
</script>

<template>
  <button class="add-element" type="button">
    <v-icon :icon="icon ?? 'mdi-plus'" size="small" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.add-element {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px;
  color: var(--app-on-surface);
  background: color-mix(in srgb, #fff 7%, transparent);
  border: 1px dashed rgb(255 255 255 / 35%);
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.add-element:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
</style>
