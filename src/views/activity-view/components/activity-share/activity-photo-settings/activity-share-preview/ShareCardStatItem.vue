<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  label: string;
  value: string;
  width: ShareStatWidth;
  showBorder: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  toggleWidth: [];
}>();
</script>

<template>
  <div class="stat" :class="{ 'stat--bordered': showBorder }">
    <div class="stat__actions export-hidden">
      <button
        class="stat__action"
        type="button"
        :aria-label="width === 'full' ? 'Сделать в одну колонку' : 'Растянуть на две колонки'"
        :title="width === 'full' ? 'Одна колонка' : 'На всю ширину'"
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
.stat {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
}

.stat--bordered {
  border-color: color-mix(in srgb, var(--share-text) 18%, transparent);
}

.stat__label {
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

.stat__actions {
  position: absolute;
  z-index: 2;
  top: -5px;
  right: -5px;
  display: flex;
  gap: 3px;
}

.stat__action {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  padding: 0;
  color: white;
  background: #475569;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.stat__action--remove {
  background: #d94848;
}

.stat__label {
  padding-right: 14px;
}
</style>
