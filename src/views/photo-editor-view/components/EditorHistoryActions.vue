<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import ResetCardButton from '@/views/photo-editor-view/components/ResetCardButton.vue';

const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  reset: [];
}>();

function isEditingText(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT');
}

// Десктоп: Ctrl/⌘+Z — назад, Ctrl/⌘+Shift+Z или Ctrl+Y — вперёд.
// При вводе текста оставляем браузерную отмену.
function handleKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || isEditingText(event.target)) return;

  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey && props.canUndo) {
    event.preventDefault();
    emit('undo');
  } else if (((key === 'z' && event.shiftKey) || key === 'y') && props.canRedo) {
    event.preventDefault();
    emit('redo');
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <!-- Капсула: отменить · повторить │ сбросить. -->
  <div class="history-actions">
    <button
      type="button"
      class="history-actions__button"
      :disabled="!canUndo"
      aria-label="Отменить действие"
      title="Отменить действие"
      @click="emit('undo')"
    >
      <v-icon icon="mdi-undo" size="20" />
    </button>
    <button
      type="button"
      class="history-actions__button"
      :disabled="!canRedo"
      aria-label="Повторить действие"
      title="Повторить действие"
      @click="emit('redo')"
    >
      <v-icon icon="mdi-redo" size="20" />
    </button>
    <span class="history-actions__separator" aria-hidden="true" />
    <ResetCardButton @confirm="emit('reset')" />
  </div>
</template>

<style scoped>
.history-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-on-surface) 8%, transparent);
}

.history-actions__separator {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: color-mix(in srgb, var(--app-on-surface) 18%, transparent);
}

/* Общий вид кнопок капсулы — и для сброса (ResetCardButton). */
.history-actions :deep(.history-actions__button) {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  padding: 0;
  color: var(--app-on-surface);
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.history-actions :deep(.history-actions__button:active:not(:disabled)) {
  background: color-mix(in srgb, var(--app-on-surface) 12%, transparent);
}

.history-actions :deep(.history-actions__button:disabled) {
  color: color-mix(in srgb, var(--app-on-surface) 32%, transparent);
  cursor: default;
}

.history-actions :deep(.history-actions__button:focus-visible) {
  outline: 2px solid var(--app-primary);
  outline-offset: 1px;
}
</style>
