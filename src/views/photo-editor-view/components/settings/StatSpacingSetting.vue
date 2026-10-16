<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { STAT_SPACING_MAX, STAT_SPACING_MIN } from '@/hooks/useShareCardSettings';
import { useKeepElementInPlace } from '@/hooks/useKeepElementInPlace';

const spacing = defineModel<number>({ required: true });

const TICKS = {
  [STAT_SPACING_MIN]: 'Плотно',
  [(STAT_SPACING_MIN + STAT_SPACING_MAX) / 2]: 'Средне',
  [STAT_SPACING_MAX]: 'Свободно',
};

const root = useTemplateRef<HTMLElement>('root');
const { keepInPlace } = useKeepElementInPlace(root);

// Карточка над слайдером меняет высоту — держим слайдер под пальцем.
function handleUpdate(value: number) {
  keepInPlace(() => {
    spacing.value = value;
  });
}
</script>

<template>
  <div ref="root" class="spacing-setting">
    <div class="spacing-setting__title">
      <v-icon icon="mdi-arrow-collapse-vertical" size="18" />
      Плотность показателей
    </div>

    <v-slider
      :model-value="spacing"
      :min="STAT_SPACING_MIN"
      :max="STAT_SPACING_MAX"
      :step="2"
      :ticks="TICKS"
      show-ticks="always"
      tick-size="4"
      hide-details
      color="primary"
      track-size="4"
      thumb-size="16"
      aria-label="Плотность показателей"
      @update:model-value="handleUpdate"
    />

    <div class="spacing-setting__description">
      Управляет расстоянием между показателями статистики
    </div>
  </div>
</template>

<style scoped>
.spacing-setting {
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.spacing-setting__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.spacing-setting :deep(.v-slider) {
  margin: 8px 4px 18px;
}

.spacing-setting :deep(.v-slider-track__tick-label) {
  font-size: 10px;
  white-space: nowrap;
}

.spacing-setting__description {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.65;
}
</style>
