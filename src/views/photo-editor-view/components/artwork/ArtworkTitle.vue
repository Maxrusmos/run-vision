<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';

const MAX_LENGTH = 80;

const props = defineProps<{
  value: string;
  textColor: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
  change: [value: string];
  changeTextColor: [color: string];
}>();

const textElement = useTemplateRef<HTMLElement>('text');

// Текст пишем в DOM вручную: при реактивном рендере Vue перезаписывал бы
// содержимое contenteditable прямо во время ввода.
function syncText() {
  const element = textElement.value;
  if (element && document.activeElement !== element && element.textContent !== props.value) {
    element.textContent = props.value;
  }
}

onMounted(syncText);
watch(() => props.value, syncText);

// Сняли выделение (тап мимо, экспорт) — завершаем редактирование.
watch(
  () => props.selected,
  (selected) => {
    if (!selected && document.activeElement === textElement.value) {
      textElement.value?.blur();
    }
  },
);

function commit() {
  const element = textElement.value;
  if (!element) return;

  emit('change', (element.textContent ?? '').replace(/\s+/g, ' ').slice(0, MAX_LENGTH));
  // Если название не изменилось (например, стёрли всё), вернём отображаемое значение.
  requestAnimationFrame(syncText);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    textElement.value?.blur();
  }
}
</script>

<template>
  <div class="artwork-title" :class="{ 'artwork-title--selected': selected }" data-selectable>
    <SelectionFrame v-if="selected" />

    <span
      ref="text"
      class="artwork-title__text"
      contenteditable="plaintext-only"
      role="textbox"
      aria-label="Название тренировки"
      spellcheck="false"
      enterkeyhint="done"
      @focus="emit('select')"
      @blur="commit"
      @keydown="handleKeydown"
    />

    <ArtworkElementToolbar v-if="selected" class="artwork-title__toolbar export-hidden">
      <ColorPickerButton
        label="Цвет текста"
        :color="textColor"
        @change="emit('changeTextColor', $event)"
      />
    </ArtworkElementToolbar>
  </div>
</template>

<style scoped>
.artwork-title {
  position: relative;
  width: max-content;
  max-width: calc(100% + 12px);
  margin: 4px -6px -4px;
  padding: 4px 6px;
  border-radius: 10px;
  font-size: clamp(23px, 5vw, 34px);
  font-weight: 800;
  line-height: 1;
}

.artwork-title__text {
  display: block;
  min-width: 1ch;
  overflow-wrap: anywhere;
  outline: none;
  cursor: text;
  -webkit-tap-highlight-color: transparent;
}

.artwork-title__toolbar {
  position: absolute;
  z-index: 3;
  top: -14px;
  right: -14px;
}
</style>
