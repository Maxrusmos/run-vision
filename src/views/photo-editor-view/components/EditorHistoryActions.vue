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
  <div class="history-actions">
    <v-btn
      icon="mdi-arrow-u-left-top"
      variant="text"
      size="small"
      density="comfortable"
      :disabled="!canUndo"
      aria-label="Отменить действие"
      title="Отменить действие"
      @click="emit('undo')"
    />
    <v-btn
      icon="mdi-arrow-u-right-top"
      variant="text"
      size="small"
      density="comfortable"
      :disabled="!canRedo"
      aria-label="Повторить действие"
      title="Повторить действие"
      @click="emit('redo')"
    />
    <ResetCardButton @confirm="emit('reset')" />
  </div>
</template>

<style scoped>
.history-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}
</style>
