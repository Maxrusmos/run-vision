<template>
  <!-- Горизонтальный ряд плиток со свайпом. Одинаковая высота во всех панелях. -->
  <div class="option-tile-row">
    <slot />
  </div>
</template>

<style scoped>
.option-tile-row {
  display: flex;
  gap: 8px;
  margin: 0 -16px;
  /* Сверху место под кнопку удаления на плитке. */
  padding: 8px 16px 2px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  /* Иначе привязка прокрутки прижимает первую плитку к краю, игнорируя отступ. */
  scroll-padding-inline: 16px;
  scrollbar-width: none;
}

.option-tile-row::-webkit-scrollbar {
  display: none;
}

.option-tile-row > :deep(*) {
  scroll-snap-align: start;
}
</style>
