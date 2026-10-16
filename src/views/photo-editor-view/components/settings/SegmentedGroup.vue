<script setup lang="ts" generic="T extends string | number">
/**
 * Группа кнопок-переключателей над плитками панели (как сетка и плотность в «Показателях»).
 * Содержимое кнопки — слот `option` (по умолчанию подпись).
 */
defineProps<{
  options: readonly { value: T; label?: string; title: string }[];
  groupLabel: string;
  /** Растягиваться на свободное место в строке. */
  grow?: boolean;
}>();

const model = defineModel<T>({ required: true });
</script>

<template>
  <div
    class="segmented-group"
    :class="{ 'segmented-group--grow': grow }"
    role="radiogroup"
    :aria-label="groupLabel"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="segmented-group__option"
      :class="{ 'segmented-group__option--active': model === option.value }"
      role="radio"
      :aria-checked="model === option.value"
      :aria-label="option.title"
      :title="option.title"
      @click="model = option.value"
    >
      <slot name="option" :option="option">{{ option.label }}</slot>
    </button>
  </div>
</template>

<style scoped>
.segmented-group {
  display: flex;
  padding: 2px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.segmented-group--grow {
  flex: 1 1 auto;
}

.segmented-group__option {
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

.segmented-group__option--active {
  color: var(--app-primary);
  background: var(--app-primary-bg);
}
</style>
