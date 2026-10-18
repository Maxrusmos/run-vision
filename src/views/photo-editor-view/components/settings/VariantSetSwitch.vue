<script setup lang="ts">
/**
 * Какие варианты показывать в ряду плиток: обычные или Pro. Закреплён слева в ряду
 * (`OptionTileRow`, слот `fixed`) — высотой с плитку, две кнопки столбиком: панель не
 * становится выше. Как `SegmentedGroup`, только вертикально.
 */
export type VariantSet = 'regular' | 'pro';

const model = defineModel<VariantSet>({ required: true });

const OPTIONS: readonly { value: VariantSet; label: string; title: string }[] = [
  { value: 'regular', label: 'Обычные', title: 'Обычные варианты' },
  { value: 'pro', label: 'Pro', title: 'Варианты Pro' },
];
</script>

<template>
  <div class="variant-set-switch" role="radiogroup" aria-label="Какие варианты показывать">
    <button
      v-for="option in OPTIONS"
      :key="option.value"
      type="button"
      role="radio"
      class="variant-set-switch__option"
      :class="{
        'variant-set-switch__option--active': model === option.value,
        'variant-set-switch__option--pro': option.value === 'pro',
      }"
      :aria-checked="model === option.value"
      :title="option.title"
      @click="model = option.value"
    >
      <v-icon v-if="option.value === 'pro'" icon="mdi-crown" size="14" />
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.variant-set-switch {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 2px;
  width: 76px;
  padding: 2px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.variant-set-switch__option {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
  border: 0;
  border-radius: 9px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.variant-set-switch__option--active {
  color: var(--app-primary);
  background: var(--app-primary-bg);
}

/* Pro — золотом, как корона на плитках и аватаре. */
.variant-set-switch__option--pro {
  color: color-mix(in srgb, #ffd24a 80%, var(--app-on-surface));
}

.variant-set-switch__option--pro.variant-set-switch__option--active {
  color: #ffd24a;
  background: color-mix(in srgb, #ffd24a 16%, transparent);
}
</style>
