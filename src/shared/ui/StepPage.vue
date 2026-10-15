<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Максимальная ширина контента; `none` — на всю ширину. */
    maxWidth?: string;
  }>(),
  { maxWidth: '760px' },
);
</script>

<template>
  <div class="step-page">
    <div class="step-page__scroll">
      <div class="step-page__content" :style="{ maxWidth }">
        <slot />
      </div>
    </div>

    <footer v-if="$slots.footer" class="step-page__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.step-page {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.step-page__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.step-page__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0 auto;
  padding: 24px;
}

.step-page__footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 68px;
  padding: 12px 24px;
  border-top: 1px solid var(--app-border);
  background: var(--app-background);
  box-shadow: 0 -4px 12px rgb(0 0 0 / 4%);
}

@media (max-width: 600px) {
  .step-page__content {
    gap: 16px;
    padding: 16px 12px;
  }

  .step-page__footer {
    gap: 8px;
    padding: 12px 12px max(12px, env(safe-area-inset-bottom));
  }

  .step-page__footer > :slotted(.v-btn) {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
