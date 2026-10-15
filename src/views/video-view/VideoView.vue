<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ROUTE_NAMES } from '@/router/routes';
import StepPage from '@/shared/ui/StepPage.vue';

const router = useRouter();
</script>

<template>
  <StepPage>
    <section class="video-placeholder">
      <v-icon icon="mdi-movie-open-outline" size="40" color="primary" />
      <h2 class="video-placeholder__title">Создание видео</h2>
      <p class="video-placeholder__text">Настройки видео добавим позже.</p>
    </section>

    <template #footer>
      <v-btn variant="tonal" @click="router.push({ name: ROUTE_NAMES.shareType })">Назад</v-btn>
    </template>
  </StepPage>
</template>

<style scoped>
.video-placeholder {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.video-placeholder__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.video-placeholder__text {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
}
</style>
