<template>
  <section class="video-placeholder">
    <v-icon icon="mdi-movie-open-outline" size="40" color="primary" />
    <h3 class="video-placeholder__title">Создание видео</h3>
    <p class="video-placeholder__text">Настройки видео добавим позже.</p>
  </section>
</template>

<style scoped>
.video-placeholder {
  display: flex;
  min-height: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.video-placeholder__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.video-placeholder__text {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
}
</style>
