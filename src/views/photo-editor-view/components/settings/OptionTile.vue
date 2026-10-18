<script setup lang="ts">
/**
 * Плитка настройки для горизонтальных панелей: превью сверху, подпись снизу.
 * tag="label" — когда внутри скрытый input (выбор цвета или файла).
 */
withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    tag?: 'button' | 'label';
  }>(),
  { active: false, disabled: false, tag: 'button' },
);
</script>

<template>
  <component
    :is="tag"
    class="option-tile"
    :class="{ 'option-tile--active': active, 'option-tile--disabled': disabled }"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-pressed="tag === 'button' ? active : undefined"
  >
    <span class="option-tile__preview">
      <slot name="preview" />
    </span>
    <span class="option-tile__label">{{ label }}</span>
    <slot />
  </component>
</template>

<style scoped>
.option-tile {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 80px;
  padding: 5px;
  color: inherit;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    opacity 0.15s;
}

/* Обводка фокуса — только для клавиатуры, не после тапа. */
.option-tile:focus-visible,
.option-tile:has(:focus-visible) {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.option-tile--active {
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}

.option-tile--disabled {
  cursor: default;
  opacity: 0.4;
  pointer-events: none;
}

.option-tile__preview {
  /* Для значков поверх превью (корона Pro). */
  position: relative;
  display: grid;
  width: 100%;
  height: 46px;
  overflow: hidden;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
}

.option-tile__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
