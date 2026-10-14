<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
</script>

<template>
  <AppLayout />
</template>

<style>
:root {
  color-scheme: only dark;
}

html,
body,
#app {
  min-height: 100%;
  background-color: var(--app-background);
  color: var(--app-text);
}

.v-application {
  background: var(--app-background);
  color: var(--app-text);
}
</style>
