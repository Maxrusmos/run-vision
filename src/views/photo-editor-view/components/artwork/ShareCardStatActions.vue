<script setup lang="ts">
import type { ShareStatWidth } from '@/entities/activity/model/activity-share/activity-share.types';

defineProps<{
  width: ShareStatWidth;
}>();

const emit = defineEmits<{
  toggleWidth: [];
  remove: [];
}>();
</script>

<template>
  <div class="stat-actions">
    <button
      class="stat-actions__button"
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
      class="stat-actions__button stat-actions__button--remove"
      type="button"
      aria-label="Удалить показатель"
      @click.stop="emit('remove')"
    >
      <v-icon icon="mdi-close" size="x-small" />
    </button>
  </div>
</template>

<style scoped>
.stat-actions {
  display: flex;
  gap: 2px;
}

.stat-actions__button {
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

.stat-actions__button--remove {
  background: #d94848;
}
</style>
