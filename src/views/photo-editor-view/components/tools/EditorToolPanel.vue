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
    <header class="tool-panel__header">
      <h2 class="tool-panel__title">{{ title }}</h2>
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        density="comfortable"
        aria-label="Свернуть панель"
        @click="emit('close')"
      />
    </header>

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

.tool-panel__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 0 16px;
}

.tool-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.tool-panel__content {
  min-height: 0;
  padding: 8px 16px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
