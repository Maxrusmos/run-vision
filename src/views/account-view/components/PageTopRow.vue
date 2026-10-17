<script setup lang="ts">
/** Верхняя строка страниц кабинета: круглая «назад», подпись и действия справа. */
defineProps<{
  backLabel: string;
}>();

const emit = defineEmits<{
  back: [];
}>();
</script>

<template>
  <div class="page-top-row">
    <button type="button" class="page-top-row__back" :aria-label="backLabel" @click="emit('back')">
      <v-icon icon="mdi-arrow-left" size="22" />
    </button>
    <div class="page-top-row__title">
      <slot />
    </div>
    <div v-if="$slots.actions" class="page-top-row__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.page-top-row__back {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  color: var(--app-on-surface);
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--app-on-surface) 10%, transparent);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.page-top-row__back:active {
  background: color-mix(in srgb, var(--app-on-surface) 18%, transparent);
}

.page-top-row__title {
  flex: 1 1 auto;
  min-width: 0;
}

.page-top-row__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}
</style>
