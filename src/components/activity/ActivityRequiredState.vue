<script setup lang="ts">
import GpxImportButton from '@/components/gpx-import/GpxImportButton.vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: 'Загрузите тренировку',
    description: 'Импортируйте GPX файл, чтобы создать карточку маршрута.',
  },
);
</script>

<template>
  <div class="activity-required">
    <v-icon icon="mdi-run" size="56" class="activity-required__icon" />
    <h2 class="activity-required__title">{{ title }}</h2>
    <p class="activity-required__description">{{ description }}</p>
    <GpxImportButton variant="flat" size="large" />
  </div>
</template>

<style scoped>
.activity-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 420px;
  margin: 0 auto;
  padding: 48px 16px;
  text-align: center;
}

.activity-required__icon {
  margin-bottom: 8px;
  color: var(--app-primary);
}

.activity-required__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.activity-required__description {
  margin: 0 0 12px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
}
</style>
