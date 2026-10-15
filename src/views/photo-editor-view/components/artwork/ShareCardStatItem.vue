<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';
import ShareCardStatActions from '@/views/photo-editor-view/components/artwork/ShareCardStatActions.vue';

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
    :class="{
      'stat--bordered': showBorder,
      'stat--selected': selected,
      [`stat--${width}`]: true,
    }"
    @click="emit('select')"
  >
    <ShareCardStatActions
      class="stat__actions export-hidden"
      :width="width"
      :inert="!selected"
      @set-width="emit('setWidth', $event)"
      @remove="emit('remove')"
    />

    <div class="stat__label">{{ label }}</div>
    <div class="stat__value">{{ value }}</div>
  </div>
</template>

<style scoped>
@property --stat-wave-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.stat {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: var(--share-stat-padding-y, 8px) var(--share-stat-padding-x, 8px);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
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
  border-color: color-mix(in srgb, var(--share-text) 65%, transparent);
}

.stat--selected::before {
  position: absolute;
  z-index: 1;
  inset: -1px;
  padding: 1.5px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--stat-wave-angle),
    transparent 0deg,
    transparent 245deg,
    color-mix(in srgb, var(--share-text) 25%, transparent) 275deg,
    color-mix(in srgb, var(--share-text) 100%, transparent) 310deg,
    color-mix(in srgb, var(--share-text) 55%, transparent) 330deg,
    transparent 355deg
  );
  content: '';
  pointer-events: none;

  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;

  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;

  animation: stat-border-wave 2.4s linear infinite;
}

.stat__actions {
  position: absolute;
  z-index: 2;
  top: -9px;
  right: -6px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px) scale(0.95);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    visibility 160ms ease;
}

.stat--selected .stat__actions {
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

/* В трети ширины длинные значения уменьшаем, чтобы они помещались. */
.stat--third .stat__value {
  font-size: clamp(14px, 3vw, 20px);
}

.stat__value {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
  line-height: 1.15;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

@keyframes stat-border-wave {
  from {
    --stat-wave-angle: 0deg;
  }

  to {
    --stat-wave-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stat,
  .stat__actions {
    transition: none;
  }

  .stat--selected::before {
    animation: none;
    background: color-mix(in srgb, var(--share-text) 50%, transparent);
  }
}
</style>
