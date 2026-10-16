<script setup lang="ts">
import EditorHistoryActions from '@/views/photo-editor-view/components/EditorHistoryActions.vue';

defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  back: [];
  undo: [];
  redo: [];
  reset: [];
  save: [];
}>();
</script>

<template>
  <header class="editor-top-bar">
    <v-btn
      icon="mdi-arrow-left"
      variant="text"
      size="small"
      density="comfortable"
      aria-label="Назад к выбору стиля"
      @click="emit('back')"
    />

    <EditorHistoryActions
      class="editor-top-bar__history"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @reset="emit('reset')"
    />

    <v-btn
      class="editor-top-bar__save"
      color="primary"
      variant="flat"
      size="small"
      :loading="saving"
      @click="emit('save')"
    >
      Сохранить
    </v-btn>
  </header>
</template>

<style scoped>
.editor-top-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  padding: max(6px, env(safe-area-inset-top)) 12px 6px 6px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-background);
}

.editor-top-bar__history {
  margin: 0 auto;
}

.editor-top-bar__save {
  letter-spacing: 0;
  text-transform: none;
}
</style>
