<template>
  <span class="selection-frame export-hidden" aria-hidden="true" />
</template>

<style scoped>
@property --selection-wave-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* Рамка выделения с бегущей «волной». Цвет — от текста карточки. */
.selection-frame {
  position: absolute;
  z-index: 1;
  inset: -1px;
  padding: 1.5px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--selection-wave-angle),
    color-mix(in srgb, var(--share-text) 35%, transparent) 0deg,
    color-mix(in srgb, var(--share-text) 35%, transparent) 245deg,
    color-mix(in srgb, var(--share-text) 60%, transparent) 275deg,
    var(--share-text) 310deg,
    color-mix(in srgb, var(--share-text) 70%, transparent) 330deg,
    color-mix(in srgb, var(--share-text) 35%, transparent) 355deg
  );
  pointer-events: none;

  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;

  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;

  animation: selection-wave 2.4s linear infinite;
}

@keyframes selection-wave {
  from {
    --selection-wave-angle: 0deg;
  }

  to {
    --selection-wave-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .selection-frame {
    animation: none;
    background: color-mix(in srgb, var(--share-text) 60%, transparent);
  }
}
</style>
