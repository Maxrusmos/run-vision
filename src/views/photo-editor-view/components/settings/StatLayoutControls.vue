<script setup lang="ts">
import { computed } from 'vue';
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_STAT_COLUMN_OPTIONS,
  SHARE_STAT_DENSITY_OPTIONS,
} from '@/entities/activity/model/activity-share/activity-share-stat-styles';

const props = defineProps<{
  /** Ширины показателей на карточке. */
  widths: ShareStatWidth[];
  spacing: number;
}>();

const emit = defineEmits<{
  setColumns: [width: ShareStatWidth];
  setSpacing: [spacing: number];
}>();

// Сетка подсвечивается, только если все показатели одной ширины.
const currentWidth = computed(() => {
  const [first] = props.widths;
  return first && props.widths.every((width) => width === first) ? first : null;
});
</script>

<template>
  <!-- Сетка и плотность в одну строку — панель остаётся низкой. -->
  <div class="stat-layout">
    <div class="stat-layout__group" role="radiogroup" aria-label="Сетка показателей">
      <button
        v-for="option in SHARE_STAT_COLUMN_OPTIONS"
        :key="option.columns"
        type="button"
        class="stat-layout__option stat-layout__option--icon"
        :class="{ 'stat-layout__option--active': currentWidth === option.width }"
        role="radio"
        :aria-checked="currentWidth === option.width"
        :aria-label="`${option.columns} в ряд`"
        :title="`${option.columns} в ряд`"
        @click="emit('setColumns', option.width)"
      >
        <span class="stat-layout__grid" :style="{ '--columns': option.columns }" aria-hidden="true">
          <span v-for="index in option.columns * 2" :key="index" />
        </span>
      </button>
    </div>

    <div class="stat-layout__group" role="radiogroup" aria-label="Плотность показателей">
      <button
        v-for="option in SHARE_STAT_DENSITY_OPTIONS"
        :key="option.spacing"
        type="button"
        class="stat-layout__option"
        :class="{ 'stat-layout__option--active': spacing === option.spacing }"
        role="radio"
        :aria-checked="spacing === option.spacing"
        @click="emit('setSpacing', option.spacing)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.stat-layout {
  display: flex;
  gap: 8px;
}

.stat-layout__group {
  display: flex;
  padding: 2px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.stat-layout__group:last-child {
  flex: 1 1 auto;
}

.stat-layout__option {
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

.stat-layout__option--active {
  color: var(--app-primary);
  background: var(--app-primary-bg);
}

/* Мини-схема сетки: два ряда по N ячеек. */
.stat-layout__grid {
  display: grid;
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: 2px;
  width: 18px;
}

.stat-layout__grid > span {
  height: 5px;
  border-radius: 1.5px;
  background: currentColor;
}
</style>
