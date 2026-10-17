<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    /** Ограничение высоты панели (по умолчанию — 42% экрана). */
    maxHeight?: string;
  }>(),
  { maxHeight: '42dvh' },
);

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <section class="tool-panel" :aria-label="title" :style="{ maxHeight }">
    <!-- Вместо заголовка — тонкая «ручка»: экономит высоту. Активный инструмент и так подсвечен. -->
    <button
      type="button"
      class="tool-panel__handle"
      :aria-label="`Свернуть панель «${title}»`"
      @click="emit('close')"
    >
      <span class="tool-panel__grip" aria-hidden="true" />
    </button>

    <div class="tool-panel__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.tool-panel {
  display: flex;
  flex-direction: column;
  /* На широком экране панель не растягивается на всю ширину. */
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  border-top: 1px solid var(--app-border);
  border-radius: 16px 16px 0 0;
  background: var(--app-surface);
  box-shadow: 0 -6px 18px rgb(0 0 0 / 25%);
}

.tool-panel__handle {
  display: grid;
  flex: 0 0 auto;
  height: 16px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.tool-panel__grip {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--app-on-surface) 30%, transparent);
}

.tool-panel__content {
  min-height: 0;
  /*
   * Ритм панелей: от «ручки» до первого ряда и от последнего ряда до низа — по 14px,
   * между рядами — 12px. Ряд плиток (`OptionTileRow`) сам даёт 8px сверху (место под
   * кнопку удаления на плитке) и 2px снизу; панель, где сверху кнопки, добавляет себе
   * те же 8px сверху, а между кнопками и плитками — gap 4px + 8px ряда.
   */
  padding: 0 16px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
