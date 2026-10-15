<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/routes';
</script>

<template>
  <v-app-bar flat border="bottom" class="app-bar">
    <v-app-bar-title class="app-title">
      <router-link :to="{ name: ROUTE_NAMES.share }" class="app-title__link">
        RunVision
      </router-link>
    </v-app-bar-title>
  </v-app-bar>
</template>

<style scoped>
.app-title__link {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 600px) {
  .app-bar {
    height: 48px !important;
  }

  .app-bar :deep(.v-toolbar__content) {
    height: 48px !important;
    min-height: 48px !important;
  }

  .app-title {
    font-size: 16px;
  }
}
</style>
