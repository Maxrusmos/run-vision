<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';
import { useLongPressDrag } from '@/hooks/useLongPressDrag';
import { dragTrash } from '@/hooks/useDragTrash';

const MAX_LENGTH = 80;

const props = defineProps<{
  value: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
  change: [value: string];
  remove: [];
}>();

const textElement = useTemplateRef<HTMLElement>('text');
const rootElement = useTemplateRef<HTMLElement>('root');

// Удаление — перетаскиванием в корзину: долгое нажатие на название (не во время ввода)
// и тянуть вниз. Название едет за пальцем; отпустили не над корзиной — вернулось на место.
const drag = ref<{ dx: number; dy: number; scale: number } | null>(null);
let justDragged = false;

function handleFocus() {
  if (justDragged) {
    textElement.value?.blur();
    return;
  }
  emit('select');
}

const { start: startDrag } = useLongPressDrag<'title'>({
  onStart: () => {
    const element = rootElement.value;
    const rect = element?.getBoundingClientRect();
    drag.value = {
      dx: 0,
      dy: 0,
      // Карточка на экране уменьшена: экранные пиксели переводим в пиксели раскладки.
      scale: rect && element?.offsetWidth ? rect.width / element.offsetWidth : 1,
    };
  },
  onMove: (_id, dx, dy) => {
    if (drag.value) Object.assign(drag.value, { dx, dy });
  },
  onEnd: () => {
    drag.value = null;
    // Отпускание после переноса — не тап: не начинать редактирование (и клавиатуру).
    justDragged = true;
    window.setTimeout(() => (justDragged = false), 400);
  },
  onTrash: () => emit('remove'),
});

function handlePointerDown(event: PointerEvent) {
  // Во время ввода жесты — для текста (выделение, курсор), а не для переноса.
  if (props.selected) return;
  startDrag(event, 'title', false);
}

const dragStyle = computed(() =>
  drag.value
    ? {
        transform: `translate(${drag.value.dx / drag.value.scale}px, ${drag.value.dy / drag.value.scale}px)`,
      }
    : undefined,
);

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
  <div
    ref="root"
    class="artwork-title"
    :class="{
      'artwork-title--selected': selected,
      'artwork-title--dragging': drag,
      'artwork-title--over-trash': drag && dragTrash.state.over,
    }"
    :style="dragStyle"
    data-selectable
    @pointerdown="handlePointerDown"
  >
    <SelectionFrame v-if="selected" />

    <span
      ref="text"
      class="artwork-title__text"
      contenteditable="plaintext-only"
      role="textbox"
      aria-label="Название тренировки"
      spellcheck="false"
      enterkeyhint="done"
      @focus="handleFocus"
      @blur="commit"
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.artwork-title {
  position: relative;
  /* Блок на всю ширину (как показатель), текст остаётся на линии отступа карточки. */
  margin: -8px;
  padding: 8px;
  border-radius: 12px;
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

/* Пока не редактируют, долгое нажатие — перенос, а не меню iOS. */
.artwork-title:not(.artwork-title--selected) {
  -webkit-touch-callout: none;
}

.artwork-title--dragging {
  user-select: none;
  z-index: 10;
  background: color-mix(in srgb, var(--share-background) 88%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
}

.artwork-title--over-trash {
  opacity: 0.45;
  outline: 2px solid #e5484d;
  outline-offset: 2px;
  scale: 0.92;
}
</style>
