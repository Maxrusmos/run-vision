<script setup lang="ts">
import { useTemplateRef } from 'vue';

const props = defineProps<{
  color: string;
  label: string;
  /** Для экранного диктора: что именно красим. */
  inputLabel: string;
  active?: boolean;
  disabled?: boolean;
  /**
   * Есть вариант «цвет трека» (график, виджеты, точка видео): плитка делится пополам —
   * сверху палитра, снизу кнопка «Цвет трека». Появляется и пропадает с анимацией.
   */
  withTrackColor?: boolean;
  /** Сейчас цвет как у трека (подсвечена «Цвет трека»). */
  trackColor?: boolean;
  /**
   * Свой цвет сейчас что-то сбросит (стиль трека со своими цветами, Pro-фон): тап не
   * открывает палитру, а шлёт `guarded` — родитель предупреждает и сам зовёт `openPicker`.
   */
  guarded?: boolean;
}>();

const emit = defineEmits<{
  change: [color: string];
  /** Нижняя половина плитки: вернуть цвет трека. */
  useTrackColor: [];
  /** Тап по палитре при `guarded`. */
  guarded: [];
}>();

const input = useTemplateRef<HTMLInputElement>('input');

function handlePickClick(event: MouseEvent) {
  if (!props.guarded) return;
  event.preventDefault();
  emit('guarded');
}

/**
 * Открыть палитру из кода — после подтверждения в диалоге. Вызывать из обработчика
 * нажатия (кнопки диалога): палитру браузер открывает только в ответ на жест.
 */
function openPicker() {
  const element = input.value;
  if (!element) return;
  try {
    element.showPicker();
  } catch {
    element.click();
  }
}

defineExpose({ openPicker });
</script>

<template>
  <!-- Палитра (label) и «Цвет трека» — соседи, не вложены: иначе тап по кнопке открывал бы
       палитру. -->
  <div
    class="color-tile"
    :class="{
      'color-tile--split': props.withTrackColor,
      'color-tile--active': props.withTrackColor ? !props.trackColor : props.active,
      'color-tile--disabled': props.disabled,
    }"
  >
    <!-- Тап открывает системную палитру. -->
    <label class="color-tile__pick" @click="handlePickClick">
      <span class="color-tile__swatch" :style="{ background: color }">
        <v-icon icon="mdi-eyedropper-variant" size="18" />
      </span>
      <input
        ref="input"
        class="visually-hidden"
        type="color"
        :value="color"
        :aria-label="inputLabel"
        @input="emit('change', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <span class="color-tile__label" :aria-hidden="props.withTrackColor">{{ label }}</span>
    <div class="color-tile__track-slot">
      <button
        type="button"
        class="color-tile__track"
        :class="{ 'color-tile__track--active': props.trackColor }"
        :aria-pressed="props.trackColor"
        :tabindex="props.withTrackColor ? undefined : -1"
        :aria-hidden="!props.withTrackColor"
        @click="emit('useTrackColor')"
      >
        Цвет трека
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * Размеры — как у OptionTile (рамка 1 + поля 5 + превью 46 + 4 + подпись 16.5): та же высота
 * ряда. Строки сетки: палитра · подпись · «Цвет трека»; в разделённом виде подпись
 * схлопывается, а палитра и кнопка делят высоту пополам — переход анимирован.
 */
.color-tile {
  display: grid;
  flex: 0 0 auto;
  grid-template-rows: 46px 20.5px 0px;
  width: 80px;
  padding: 5px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  transition:
    grid-template-rows 0.22s ease,
    border-color 0.15s,
    background-color 0.15s;
}

.color-tile--split {
  grid-template-rows: 31px 0px 35.5px;
}

.color-tile--active {
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}

.color-tile--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.color-tile__pick {
  display: block;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.color-tile__pick:has(:focus-visible),
.color-tile__track:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.color-tile__swatch {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #fff;
}

.color-tile__swatch :deep(.v-icon) {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 70%));
}

.color-tile__label {
  min-height: 0;
  padding-top: 4px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 500;
  line-height: 16.5px;
  text-align: center;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.color-tile--split .color-tile__label {
  opacity: 0;
}

.color-tile__track-slot {
  display: flex;
  min-height: 0;
  padding-top: 4px;
  overflow: hidden;
}

.color-tile__track {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  color: color-mix(in srgb, var(--app-on-surface) 85%, transparent);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-on-surface) 6%, transparent);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.color-tile--split .color-tile__track {
  opacity: 1;
}

.color-tile__track--active {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}
</style>
