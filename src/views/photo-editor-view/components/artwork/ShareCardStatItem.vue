<script setup lang="ts">
import type {
  ShareStatStyle,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_WIDTH_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';

defineProps<{
  label: string;
  value: string;
  width: ShareStatWidth;
  showBorder: boolean;
  selected: boolean;
  textColor: string;
  statStyle: ShareStatStyle;
}>();

const emit = defineEmits<{
  select: [];
  remove: [];
  setWidth: [width: ShareStatWidth];
  changeTextColor: [color: string];
}>();
</script>

<template>
  <div
    class="stat"
    :class="[
      `stat--${width}`,
      `stat--style-${statStyle}`,
      {
        'stat--bordered': showBorder,
        'stat--selected': selected,
      },
    ]"
    data-selectable
    @click="emit('select')"
    @contextmenu.prevent
  >
    <SelectionFrame v-if="selected" />

    <ArtworkElementToolbar
      class="stat__toolbar export-hidden"
      :model-value="width"
      :options="SHARE_STAT_WIDTH_OPTIONS"
      options-label="Ширина показателя"
      remove-label="Удалить показатель"
      :inert="!selected"
      @update:model-value="emit('setWidth', $event!)"
      @remove="emit('remove')"
    >
      <!-- Цвет текста меняется для всей карточки. -->
      <ColorPickerButton
        label="Цвет текста"
        :color="textColor"
        @change="emit('changeTextColor', $event)"
      />
    </ArtworkElementToolbar>

    <div class="stat__label">{{ label }}</div>
    <div class="stat__value">{{ value }}</div>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: var(--share-stat-padding-y, 8px) var(--share-stat-padding-x, 8px);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 180ms ease;
}

.stat--bordered {
  border-color: color-mix(in srgb, var(--share-text) 18%, transparent);
}

/*
 * Пресеты внешнего вида. Без backdrop-filter и прочих эффектов, которые
 * не попадают в PNG: в редакторе и на картинке показатель выглядит одинаково.
 */

/* Стекло: светлая полупрозрачная заливка с бликом по верхнему краю. */
.stat--style-glass {
  border-color: color-mix(in srgb, #fff 35%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #fff 24%, transparent),
    color-mix(in srgb, #fff 6%, transparent) 65%
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 50%, transparent),
    0 6px 18px rgb(0 0 0 / 18%);
}

/* Скорость: полосы движения, акцент цвета трека и наклонные цифры. */
.stat--style-speed {
  border-color: transparent;
  border-left: 3px solid var(--share-route);
  border-radius: 4px 12px 12px 4px;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0 10px,
      color-mix(in srgb, var(--share-text) 7%, transparent) 10px 12px
    ),
    linear-gradient(90deg, color-mix(in srgb, var(--share-route) 24%, transparent), transparent 85%);
}

.stat--style-speed .stat__label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat--style-speed .stat__value {
  font-style: italic;
  letter-spacing: -0.02em;
  transform: skewX(-8deg);
  transform-origin: left bottom;
}

/* Плитка: сплошная мягкая заливка без рамки. */
.stat--style-tile {
  border-color: transparent;
  border-radius: 14px;
  background: color-mix(in srgb, var(--share-text) 12%, transparent);
}

/* Неон: светящаяся рамка и цифры цвета трека. */
.stat--style-neon {
  border-color: var(--share-route);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--share-route) 70%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--share-route) 35%, transparent);
}

.stat--style-neon .stat__value {
  color: var(--share-route);
  text-shadow: 0 0 8px color-mix(in srgb, var(--share-route) 80%, transparent);
}

/* Минимал: только тонкая линия снизу и подпись капсом. */
.stat--style-minimal {
  border-color: transparent;
  border-bottom-color: color-mix(in srgb, var(--share-text) 28%, transparent);
  border-radius: 0;
}

.stat--style-minimal .stat__label {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stat--selected {
  z-index: 2;
  /* Выделенный показатель перетаскивается сразу, без прокрутки страницы. */
  touch-action: none;
}

.stat__toolbar {
  position: absolute;
  z-index: 3;
  top: -14px;
  right: -6px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px) scale(0.95);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    visibility 160ms ease;
}

.stat--selected .stat__toolbar {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.stat__label {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}

.stat__value {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
  font-weight: 800;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

/* В трети ширины длинные значения уменьшаем, чтобы они помещались. */
.stat--third .stat__value {
  font-size: clamp(14px, 3vw, 20px);
}

@media (prefers-reduced-motion: reduce) {
  .stat,
  .stat__toolbar {
    transition: none;
  }
}
</style>
