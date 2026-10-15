<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_WIDTH_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

defineProps<{
  width: ShareStatWidth;
}>();

const emit = defineEmits<{
  setWidth: [width: ShareStatWidth];
  remove: [];
}>();
</script>

<template>
  <div class="stat-actions" @click.stop>
    <div class="stat-actions__widths" role="radiogroup" aria-label="Ширина показателя">
      <button
        v-for="option in SHARE_STAT_WIDTH_OPTIONS"
        :key="option.value"
        class="stat-actions__width"
        :class="{ 'stat-actions__width--active': width === option.value }"
        type="button"
        role="radio"
        :aria-checked="width === option.value"
        :aria-label="option.title"
        :title="option.title"
        @click="emit('setWidth', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <button
      class="stat-actions__remove"
      type="button"
      aria-label="Удалить показатель"
      title="Удалить"
      @click="emit('remove')"
    >
      <v-icon icon="mdi-close" size="x-small" />
    </button>
  </div>
</template>

<style scoped>
.stat-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.stat-actions__widths {
  display: flex;
  padding: 1px;
  border-radius: 999px;
  background: #475569;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
}

.stat-actions__width,
.stat-actions__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 18px;
  padding: 0;
  color: white;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.stat-actions__width {
  min-width: 20px;
  border-radius: 999px;
  background: transparent;
  font:
    700 10px/1 Inter,
    Arial,
    sans-serif;
  opacity: 0.75;
  transition:
    background-color 150ms ease,
    opacity 150ms ease;
}

.stat-actions__width--active {
  background: rgb(255 255 255 / 28%);
  opacity: 1;
}

.stat-actions__remove {
  width: 18px;
  border-radius: 50%;
  background: #d94848;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
}
</style>
