<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { ShareBackgroundPattern } from '@/entities/activity/model/activity-share/activity-share.types';

/**
 * Узор фона «Телеметрии» — на карточке и в плитках меню «Фон».
 * Только CSS-градиенты и data-URI: их html-to-image переносит в PNG.
 */
const props = withDefaults(
  defineProps<{
    pattern: ShareBackgroundPattern;
    /** Цвет линий (цвет текста карточки), прозрачность задаёт сам узор. */
    color: string;
    /** Шаг узора в px: на карточке крупнее, в плитке меню мельче. */
    unit?: number;
  }>(),
  { unit: 24 },
);

/** Перекрестье «+» в клетке — SVG в data-URI (цвет подставляется сразу). */
function crossTile(color: string, unit: number) {
  const half = unit / 2;
  const arm = unit * 0.25;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${unit}" height="${unit}">` +
    `<path d="M${half - arm} ${half}H${half + arm}M${half} ${half - arm}V${half + arm}" ` +
    `stroke="${color}" stroke-opacity="0.35" stroke-width="1.2"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const style = computed<CSSProperties>(() => ({
  '--pattern-ink': props.color,
  '--pattern-unit': `${props.unit}px`,
  ...(props.pattern === 'crosses'
    ? {
        backgroundImage: crossTile(props.color, props.unit),
        backgroundSize: `${props.unit}px ${props.unit}px`,
      }
    : {}),
}));
</script>

<template>
  <div
    v-if="pattern !== 'none'"
    class="background-pattern"
    :class="`background-pattern--${pattern}`"
    :style="style"
    aria-hidden="true"
  />
</template>

<style scoped>
.background-pattern {
  --ink-faint: color-mix(in srgb, var(--pattern-ink) 4%, transparent);
  --ink: color-mix(in srgb, var(--pattern-ink) 8%, transparent);
  --ink-strong: color-mix(in srgb, var(--pattern-ink) 13%, transparent);

  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.background-pattern--grid {
  background:
    linear-gradient(var(--ink) 1px, transparent 1px) 0 0 / 100% var(--pattern-unit),
    linear-gradient(90deg, var(--ink) 1px, transparent 1px) 0 0 / var(--pattern-unit) 100%;
}

/* Миллиметровка: мелкая клетка и крупная каждые 4 шага. */
.background-pattern--graph {
  background:
    linear-gradient(var(--ink-strong) 1px, transparent 1px) 0 0 / 100% calc(var(--pattern-unit) * 2),
    linear-gradient(90deg, var(--ink-strong) 1px, transparent 1px) 0 0 /
      calc(var(--pattern-unit) * 2) 100%,
    linear-gradient(var(--ink-faint) 1px, transparent 1px) 0 0 / 100% calc(var(--pattern-unit) / 2),
    linear-gradient(90deg, var(--ink-faint) 1px, transparent 1px) 0 0 /
      calc(var(--pattern-unit) / 2) 100%;
}

.background-pattern--dots {
  background: radial-gradient(circle, var(--ink-strong) 1.2px, transparent 1.7px) 0 0 /
    calc(var(--pattern-unit) * 0.75) calc(var(--pattern-unit) * 0.75);
}

/* Развёртка: частые горизонтальные линии, как на экране осциллографа. */
.background-pattern--scanlines {
  background: repeating-linear-gradient(
    180deg,
    var(--ink) 0 1px,
    transparent 1px calc(var(--pattern-unit) / 6)
  );
}

/* Радар: кольца от центра и перекрестье. */
.background-pattern--radar {
  background:
    linear-gradient(var(--ink), var(--ink)) 50% 0 / 1px 100% no-repeat,
    linear-gradient(var(--ink), var(--ink)) 0 50% / 100% 1px no-repeat,
    repeating-radial-gradient(
      circle at 50% 50%,
      transparent 0 calc(var(--pattern-unit) * 2 - 1px),
      var(--ink) calc(var(--pattern-unit) * 2 - 1px) calc(var(--pattern-unit) * 2)
    );
}

.background-pattern--hatch {
  background: repeating-linear-gradient(
    135deg,
    var(--ink) 0 1px,
    transparent 1px calc(var(--pattern-unit) / 2.5)
  );
}
</style>
