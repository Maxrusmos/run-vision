<script setup lang="ts">
import type {
  EditorTool,
  EditorToolId,
} from '@/views/photo-editor-view/components/tools/editor-tools';

const props = defineProps<{
  tools: readonly EditorTool[];
  /** Инструменты, которые сейчас нечем применять (например, нет показателей). */
  disabledTools?: EditorToolId[];
}>();

function isDisabled(id: EditorToolId): boolean {
  return props.disabledTools?.includes(id) ?? false;
}

const active = defineModel<EditorToolId | null>({ required: true });

// Повторное нажатие на активный инструмент закрывает его панель.
function toggle(id: EditorToolId) {
  active.value = active.value === id ? null : id;
}
</script>

<template>
  <nav class="editor-toolbar" aria-label="Инструменты">
    <button
      v-for="tool in tools"
      :key="tool.id"
      type="button"
      class="editor-toolbar__tool"
      :class="{ 'editor-toolbar__tool--active': active === tool.id }"
      :aria-pressed="active === tool.id"
      :disabled="isDisabled(tool.id)"
      @click="toggle(tool.id)"
    >
      <v-icon :icon="tool.icon" size="24" />
      <span class="editor-toolbar__label">{{ tool.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px max(6px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--app-border);
  background: var(--app-background);
}

.editor-toolbar__tool {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 96px;
  min-height: 52px;
  padding: 6px 4px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  border: 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.editor-toolbar__tool:disabled {
  cursor: default;
  opacity: 0.35;
}

.editor-toolbar__tool--active {
  color: var(--app-primary);
  background: var(--app-primary-bg);
}

.editor-toolbar__tool:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.editor-toolbar__label {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
</style>
