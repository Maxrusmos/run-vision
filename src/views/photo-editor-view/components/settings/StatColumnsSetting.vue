<script setup lang="ts">
import { computed } from 'vue';
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_COLUMN_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-styles';

const props = defineProps<{
  /** Ширины показателей на карточке. */
  widths: ShareStatWidth[];
}>();

const emit = defineEmits<{
  select: [width: ShareStatWidth];
}>();

// Сетка подсвечивается, только если все показатели одной ширины.
const current = computed(() => {
  const [first] = props.widths;
  return first && props.widths.every((width) => width === first) ? first : null;
});
</script>

<template>
  <div class="stat-columns" role="radiogroup" aria-label="Сетка показателей">
    <button
      v-for="option in SHARE_STAT_COLUMN_OPTIONS"
      :key="option.columns"
      type="button"
      class="stat-columns__option"
      :class="{ 'stat-columns__option--active': current === option.width }"
      role="radio"
      :aria-checked="current === option.width"
      @click="emit('select', option.width)"
    >
      <span class="stat-columns__icon" :style="{ '--columns': option.columns }" aria-hidden="true">
        <span v-for="index in option.columns * 2" :key="index" />
      </span>
      <span>{{ option.columns }} в ряд</span>
    </button>
  </div>
</template>

<style scoped>
.stat-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.stat-columns__option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 8px;
  color: inherit;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.stat-columns__option--active {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}

/* Мини-схема сетки: два ряда по N ячеек. */
.stat-columns__icon {
  display: grid;
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: 2px;
  width: 18px;
}

.stat-columns__icon > span {
  height: 6px;
  border-radius: 1.5px;
  background: currentColor;
  opacity: 0.8;
}
</style>
