<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ROUTE_NAMES } from '@/router/routes';
import GpxImportButton from '@/components/gpx-import/GpxImportButton.vue';

const router = useRouter();

function goToShare() {
  router.push({ name: ROUTE_NAMES.share });
}
</script>

<template>
  <div class="import-view">
    <div class="import-view__content">
      <div class="import-view__icon">
        <v-icon icon="mdi-run" size="48" />
      </div>

      <h1 class="import-view__title">Поделитесь тренировкой</h1>
      <p class="import-view__description">
        Загрузите GPX файл, чтобы создать фото или видео вашего маршрута.
      </p>

      <GpxImportButton variant="flat" size="large" label="Загрузить GPX" @imported="goToShare" />
    </div>
  </div>
</template>

<style scoped>
.import-view {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 24px 16px;
  overflow-y: auto;
}

.import-view__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 420px;
  text-align: center;
}

.import-view__icon {
  display: grid;
  width: 88px;
  height: 88px;
  margin-bottom: 8px;
  place-items: center;
  border-radius: 24px;
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.import-view__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.import-view__description {
  margin: 0 0 12px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
  line-height: 1.5;
}
</style>
