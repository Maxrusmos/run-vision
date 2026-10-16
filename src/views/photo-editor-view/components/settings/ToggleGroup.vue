<script setup lang="ts">
/**
 * Независимые переключатели в рамке — по виду как `SegmentedGroup`,
 * но каждая кнопка включается и выключается сама по себе.
 */
defineProps<{
  options: readonly {
    key: string;
    title: string;
    active: boolean;
    label?: string;
    icon?: string;
  }[];
  groupLabel: string;
}>();

const emit = defineEmits<{
  toggle: [key: string];
}>();
</script>

<template>
  <div class="toggle-group" role="group" :aria-label="groupLabel">
    <button
      v-for="option in options"
      :key="option.key"
      type="button"
      class="toggle-group__option"
      :class="{ 'toggle-group__option--active': option.active }"
      :aria-pressed="option.active"
      :aria-label="option.title"
      :title="option.title"
      @click="emit('toggle', option.key)"
    >
      <v-icon v-if="option.icon" :icon="option.icon" size="18" />
      <template v-else>{{ option.label }}</template>
    </button>
  </div>
</template>

<style scoped>
.toggle-group {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.toggle-group__option {
  display: grid;
  flex: 1 1 0;
  min-width: 34px;
  height: 30px;
  place-items: center;
  padding: 0 6px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.toggle-group__option--active {
  color: var(--app-primary);
  background: var(--app-primary-bg);
}
</style>
