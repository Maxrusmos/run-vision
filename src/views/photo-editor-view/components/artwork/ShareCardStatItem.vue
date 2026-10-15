<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_WIDTH_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';

defineProps<{
  label: string;
  value: string;
  width: ShareStatWidth;
  showBorder: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
  remove: [];
  setWidth: [width: ShareStatWidth];
}>();
</script>

<template>
  <div
    class="stat"
    :class="[
      `stat--${width}`,
      {
        'stat--bordered': showBorder,
        'stat--selected': selected,
      },
    ]"
    data-selectable
    @click="emit('select')"
  >
    <SelectionFrame v-if="selected" />

    <ArtworkElementToolbar
      class="stat__toolbar export-hidden"
      :model-value="width"
      :options="SHARE_STAT_WIDTH_OPTIONS"
      options-label="Ширина показателя"
      remove-label="Удалить показатель"
      :inert="!selected"
      @update:model-value="emit('setWidth', $event!)"
      @remove="emit('remove')"
    />

    <div class="stat__label">{{ label }}</div>
    <div class="stat__value">{{ value }}</div>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: var(--share-stat-padding-y, 8px) var(--share-stat-padding-x, 8px);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 180ms ease;
}

/* Сетка из 6 колонок: треть = 2, половина = 3, вся ширина = 6. */
.stat--third {
  grid-column: span 2;
}

.stat--half {
  grid-column: span 3;
}

.stat--full {
  grid-column: 1 / -1;
}

.stat--bordered {
  border-color: color-mix(in srgb, var(--share-text) 18%, transparent);
}

.stat--selected {
  z-index: 2;
}

.stat__toolbar {
  position: absolute;
  z-index: 3;
  top: -14px;
  right: -6px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px) scale(0.95);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    visibility 160ms ease;
}

.stat--selected .stat__toolbar {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.stat__label {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}

.stat__value {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
  font-weight: 800;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

/* В трети ширины длинные значения уменьшаем, чтобы они помещались. */
.stat--third .stat__value {
  font-size: clamp(14px, 3vw, 20px);
}

@media (prefers-reduced-motion: reduce) {
  .stat,
  .stat__toolbar {
    transition: none;
  }
}
</style>
