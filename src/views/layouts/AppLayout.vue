<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/views/layouts/components/AppHeader.vue';
import GpxImportErrorAlert from '@/components/gpx-import/GpxImportErrorAlert.vue';

const route = useRoute();
// Полноэкранные страницы (редактор) показывают свою панель вместо шапки приложения.
const hasAppHeader = computed(() => !route.meta.hideAppHeader);
</script>

<template>
  <v-app class="app" :class="{ 'app--with-header': hasAppHeader }">
    <AppHeader v-if="hasAppHeader" />

    <v-main class="app-main">
      <div class="app-content">
        <GpxImportErrorAlert class="app-alert" />
        <router-view />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.app {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.app-main {
  height: 100%;
  min-height: 0 !important;
  overflow: hidden;
}

.app-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.app-alert {
  flex: 0 0 auto;
  margin: 16px 24px 0;
}

@media (max-width: 600px) {
  .app--with-header :deep(.v-main) {
    padding-top: 48px !important;
  }

  .app-alert {
    margin: 8px 10px 0;
  }
}
</style>
