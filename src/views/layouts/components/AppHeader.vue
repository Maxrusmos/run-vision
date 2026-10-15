<script setup lang="ts">
import { useDisplay } from 'vuetify';
import GpxImportButton from '@/components/gpx-import/GpxImportButton.vue';
import { ROUTE_NAMES } from '@/router/routes';

const { xs } = useDisplay();
</script>

<template>
  <v-app-bar flat border="bottom" class="app-bar">
    <v-app-bar-title class="app-title">
      <router-link :to="{ name: ROUTE_NAMES.shareType }" class="app-title__link">
        RunVision
      </router-link>
    </v-app-bar-title>

    <v-spacer />

    <GpxImportButton class="app-bar__import" :compact="xs" />
  </v-app-bar>
</template>

<style scoped>
.app-title__link {
  color: inherit;
  text-decoration: none;
}

.app-bar__import {
  margin-right: 16px;
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

  .app-bar__import {
    margin-right: 8px;
  }
}
</style>
