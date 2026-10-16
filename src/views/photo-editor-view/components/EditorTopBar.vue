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
  <!-- Вариант «стрелка + капсула»: назад — круглая кнопка, история и сброс — одной
       капсулой по центру, главное действие — «Сохранить» справа. -->
  <header class="editor-top-bar">
    <button
      type="button"
      class="editor-top-bar__back"
      aria-label="Назад к выбору стиля"
      title="Назад"
      @click="emit('back')"
    >
      <v-icon icon="mdi-arrow-left" size="22" />
    </button>

    <EditorHistoryActions
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
      rounded="pill"
      height="38"
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
  justify-content: space-between;
  gap: 8px;
  min-height: 56px;
  padding: max(8px, env(safe-area-inset-top)) 12px 8px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-background);
}

.editor-top-bar__back {
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
  transition: background-color 0.15s;
}

.editor-top-bar__back:active {
  background: color-mix(in srgb, var(--app-on-surface) 18%, transparent);
}

.editor-top-bar__back:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.editor-top-bar__save {
  padding-inline: 18px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
</style>
