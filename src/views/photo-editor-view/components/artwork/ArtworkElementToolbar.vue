<script setup lang="ts" generic="T extends string">
/**
 * Панель действий выделенного элемента карточки:
 * слот для своих кнопок (например, пипетки), переключатель вариантов и удаление.
 */
defineProps<{
  options?: readonly { value: T; label: string; title: string }[];
  optionsLabel?: string;
  /** Подпись кнопки удаления; без неё кнопка не показывается. */
  removeLabel?: string;
}>();

const value = defineModel<T>();

const emit = defineEmits<{
  remove: [];
}>();
</script>

<template>
  <div class="element-toolbar" data-selectable @click.stop @pointerdown.stop>
    <slot />

    <div
      v-if="options?.length"
      class="element-toolbar__options"
      role="radiogroup"
      :aria-label="optionsLabel"
    >
      <button
        v-for="option in options"
        :key="option.value"
        class="element-toolbar__option"
        :class="{ 'element-toolbar__option--active': value === option.value }"
        type="button"
        role="radio"
        :aria-checked="value === option.value"
        :aria-label="option.title"
        :title="option.title"
        @click="value = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <button
      v-if="removeLabel"
      class="element-toolbar__remove"
      type="button"
      :aria-label="removeLabel"
      :title="removeLabel"
      @click="emit('remove')"
    >
      <v-icon icon="mdi-close" size="14" />
    </button>
  </div>
</template>

<style scoped>
.element-toolbar {
  --toolbar-button-size: 24px;

  display: flex;
  align-items: center;
  gap: 4px;
}

/* Пипетка в панели — того же размера, что и кнопки. */
.element-toolbar :deep(.color-picker) {
  --color-picker-size: var(--toolbar-button-size);

  font-size: 12px;
}

.element-toolbar__options {
  display: flex;
  padding: 1px;
  border-radius: 999px;
  background: #475569;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
}

.element-toolbar__option,
.element-toolbar__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--toolbar-button-size);
  padding: 0;
  color: white;
  border: 0;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.element-toolbar__option {
  min-width: var(--toolbar-button-size);
  border-radius: 999px;
  background: transparent;
  font:
    700 11px/1 Inter,
    Arial,
    sans-serif;
  opacity: 0.75;
  transition:
    background-color 150ms ease,
    opacity 150ms ease;
}

.element-toolbar__option--active {
  background: rgb(255 255 255 / 28%);
  opacity: 1;
}

.element-toolbar__remove {
  width: var(--toolbar-button-size);
  border-radius: 50%;
  background: #d94848;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
}
</style>
