<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  label: string;
  value: string;
  width: ShareStatWidth;
  showBorder: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  toggleWidth: [];
  select: [];
}>();
</script>

<template>
  <div
    class="stat"
    :class="{
      'stat--bordered': showBorder,
      'stat--selected': selected,
    }"
    @click="emit('select')"
  >
    <div class="stat__actions export-hidden" :inert="!selected">
      <button
        class="stat__action"
        type="button"
        :aria-label="width === 'full' ? 'Сделать в две колонки' : 'Растянуть на две колонки'"
        :title="width === 'full' ? 'Две колонки' : 'На всю ширину'"
        @click.stop="emit('toggleWidth')"
      >
        <v-icon
          :icon="width === 'full' ? 'mdi-arrow-collapse-horizontal' : 'mdi-arrow-expand-horizontal'"
          size="x-small"
        />
      </button>

      <button
        class="stat__action stat__action--remove"
        type="button"
        aria-label="Удалить показатель"
        @click.stop="emit('remove')"
      >
        <v-icon icon="mdi-close" size="x-small" />
      </button>
    </div>

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
  padding: var(--share-stat-padding-y, 8px) 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 180ms ease;
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
  top: -7px;
  right: -6px;
  display: flex;
  gap: 2px;
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

.stat__action {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  padding: 0;
  color: white;
  background: #475569;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.stat__action--remove {
  background: #d94848;
}

.stat__label {
  padding-right: 14px;
  font-size: 11px;
  opacity: 0.7;
}

.stat__value {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
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
