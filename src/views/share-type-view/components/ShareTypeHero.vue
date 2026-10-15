<template>
  <header class="share-type-hero">
    <div class="share-type-hero__icon">
      <v-icon icon="mdi-share-variant-outline" size="26" />
    </div>

    <div>
      <h1 class="share-type-hero__title">Поделиться тренировкой</h1>
      <p class="share-type-hero__subtitle">Создай фото или видео маршрута</p>
    </div>
  </header>
</template>

<style scoped>
.share-type-hero {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-type-hero__icon {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 12px;
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.share-type-hero__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.share-type-hero__subtitle {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
}
</style>
