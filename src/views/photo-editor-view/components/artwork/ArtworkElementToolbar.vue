<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

/**
 * Панель действий выделенного элемента карточки: слот для своих кнопок и
 * переключатель вариантов (одна кнопка перебирает варианты по кругу).
 * Удаления здесь нет — элементы удаляются перетаскиванием в корзину.
 */
const props = defineProps<{
  options?: readonly { value: T; label: string; title: string }[];
  optionsLabel?: string;
}>();

const value = defineModel<T>();

const currentIndex = computed(() =>
  Math.max(0, props.options?.findIndex((option) => option.value === value.value) ?? 0),
);
const current = computed(() => props.options?.[currentIndex.value]);

function selectNext() {
  const options = props.options;
  if (!options?.length) return;
  value.value = options[(currentIndex.value + 1) % options.length]!.value;
}
</script>

<template>
  <div class="element-toolbar" data-selectable @click.stop @pointerdown.stop>
    <slot />

    <button
      v-if="current"
      class="element-toolbar__cycle"
      type="button"
      :aria-label="`${optionsLabel}: ${current.title}. Нажмите, чтобы изменить`"
      :title="current.title"
      @click="selectNext"
    >
      {{ current.label }}
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

.element-toolbar__cycle {
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

.element-toolbar__cycle {
  min-width: calc(var(--toolbar-button-size) + 6px);
  padding: 0 6px;
  border-radius: 999px;
  background: #475569;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
  font:
    700 12px/1 Inter,
    Arial,
    sans-serif;
}
</style>
