<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const scroller = useTemplateRef<HTMLElement>('scroller');

// Меню открывается сразу на выбранной плитке (по центру ряда), без анимации прокрутки:
// иначе стиль в конце ряда («Изолинии») приходится искать свайпами.
onMounted(() => {
  const row = scroller.value;
  const active = row?.querySelector<HTMLElement>('.option-tile--active');
  if (!row || !active) return;

  const rowRect = row.getBoundingClientRect();
  const tileRect = active.getBoundingClientRect();
  const left = row.scrollLeft + tileRect.left - rowRect.left - (rowRect.width - tileRect.width) / 2;
  row.scrollTo({ left: Math.max(0, left), behavior: 'instant' });
});
</script>

<template>
  <!-- Горизонтальный ряд плиток со свайпом. Одинаковая высота во всех панелях. -->
  <div class="option-tile-row">
    <!-- Закреплённые плитки (например, цвет) — всегда видны, не прокручиваются. -->
    <div v-if="$slots.fixed" class="option-tile-row__fixed">
      <slot name="fixed" />
    </div>
    <div
      ref="scroller"
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
