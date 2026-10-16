<template>
  <!-- Горизонтальный ряд плиток со свайпом. Одинаковая высота во всех панелях. -->
  <div class="option-tile-row">
    <!-- Закреплённые плитки (например, цвет) — всегда видны, не прокручиваются. -->
    <div v-if="$slots.fixed" class="option-tile-row__fixed">
      <slot name="fixed" />
    </div>
    <div
      class="option-tile-row__scroll"
      :class="{ 'option-tile-row__scroll--after-fixed': $slots.fixed }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.option-tile-row {
  display: flex;
  margin: 0 -16px;
}

.option-tile-row__fixed {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  /* Сверху место под кнопку удаления на плитке. */
  padding: 8px 8px 2px 16px;
  border-right: 1px solid var(--app-border);
}

.option-tile-row__scroll {
  display: flex;
  flex: 1 1 auto;
  gap: 8px;
  min-width: 0;
  padding: 8px 16px 2px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  /* Иначе привязка прокрутки прижимает первую плитку к краю, игнорируя отступ. */
  scroll-padding-inline: 16px;
  scrollbar-width: none;
}

.option-tile-row__scroll--after-fixed {
  padding-left: 8px;
  scroll-padding-inline: 8px 16px;
}

.option-tile-row__scroll::-webkit-scrollbar {
  display: none;
}

.option-tile-row__scroll > :deep(*) {
  scroll-snap-align: start;
}
</style>
