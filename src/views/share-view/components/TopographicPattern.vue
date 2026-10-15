<script setup lang="ts">
const CONTOURS = [
  'M-10 20 C10 0 30 40 50 20 S80 0 110 25',
  'M-10 32 C10 12 30 52 50 32 S80 12 110 37',
  'M-10 65 C15 45 35 85 55 65 S85 45 110 70',
  'M-10 77 C15 57 35 97 55 77 S85 57 110 82',
];
</script>

<template>
  <svg
    class="topographic-pattern"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      v-for="(path, index) in CONTOURS"
      :key="index"
      :d="path"
      fill="none"
      stroke="currentColor"
      stroke-width="0.5"
    />
  </svg>
</template>

<style scoped>
.topographic-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.4;
}
</style>
