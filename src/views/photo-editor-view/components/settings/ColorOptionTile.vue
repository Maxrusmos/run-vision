<script setup lang="ts">
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';

const props = defineProps<{
  color: string;
  label: string;
  /** Для экранного диктора: что именно красим. */
  inputLabel: string;
  active?: boolean;
  disabled?: boolean;
  /**
   * Есть вариант «цвет трека» (график, виджеты, точка видео): плитка делится на две части —
   * сверху выбор цвета, снизу кнопка «Цвет трека». true — сейчас цвет как у трека.
   */
  trackColor?: boolean;
}>();

const emit = defineEmits<{
  change: [color: string];
  /** Нижняя часть плитки: вернуть цвет трека. */
  useTrackColor: [];
}>();

const hasTrackColor = props.trackColor !== undefined;
</script>

<template>
  <!-- Тап по плитке открывает системную палитру. -->
  <OptionTile
    v-if="!hasTrackColor"
    tag="label"
    :label="label"
    :active="active"
    :disabled="disabled"
  >
    <template #preview>
      <span class="color-tile__swatch" :style="{ background: color }">
        <v-icon icon="mdi-eyedropper-variant" size="18" />
      </span>
    </template>
    <input
      class="visually-hidden"
      type="color"
      :value="color"
      :aria-label="inputLabel"
      @input="emit('change', ($event.target as HTMLInputElement).value)"
    />
  </OptionTile>

  <!-- Две кнопки в одной плитке: label с палитрой и отдельная кнопка — не вложены друг
       в друга, иначе тап по «Цвет трека» открывал бы палитру. -->
  <div
    v-else
    class="color-tile"
    :class="{ 'color-tile--own': !trackColor, 'color-tile--disabled': disabled }"
  >
    <label class="color-tile__pick" :title="label">
      <span class="color-tile__swatch" :style="{ background: color }">
        <v-icon icon="mdi-eyedropper-variant" size="16" />
      </span>
      <input
        class="visually-hidden"
        type="color"
        :value="color"
        :aria-label="inputLabel"
        @input="emit('change', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <button
      type="button"
      class="color-tile__track"
      :class="{ 'color-tile__track--active': trackColor }"
      :aria-pressed="trackColor"
      @click="emit('useTrackColor')"
    >
      Цвет трека
    </button>
  </div>
</template>

<style scoped>
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

/* Размеры — как у OptionTile: та же высота ряда. */
.color-tile {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 4px;
  width: 80px;
  padding: 5px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.color-tile--own {
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}

.color-tile--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.color-tile__pick {
  display: block;
  /* Палитра и «Цвет трека» делят плитку пополам (высота ряда — как у OptionTile: 46+4+15). */
  flex: 1 1 0;
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

/* Нижняя половина — заметная кнопка с рамкой, как у палитры сверху. */
.color-tile__track {
  flex: 1 1 0;
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
  -webkit-tap-highlight-color: transparent;
}

.color-tile__track--active {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}
</style>
