<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { parseGpx } from '@/entities/activity/parser/gpx.parser';
import { useActivityStore } from '@/stores/activity.store';

const route = useRoute();
const activityStore = useActivityStore();
const fileInput = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isActivityPage = computed(() => route.path === '/activity');

function openFileDialog() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const parsedActivity = await parseGpx(file);
    activityStore.setActivity(parsedActivity);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось импортировать GPX файл';
  } finally {
    isLoading.value = false;
    input.value = '';
  }
}
</script>

<template>
  <v-app class="app">
    <v-app-bar flat border="bottom" class="app-bar">
      <v-app-bar-title class="app-title"> RunVision </v-app-bar-title>

      <v-spacer />

      <v-btn
        v-if="isActivityPage"
        class="import-button import-button--desktop mr-4"
        color="primary"
        prepend-icon="mdi-upload"
        variant="tonal"
        :loading="isLoading"
        @click="openFileDialog"
      >
        Импортировать GPX
      </v-btn>

      <v-btn
        v-if="isActivityPage"
        class="import-button import-button--mobile mr-3"
        color="primary"
        icon="mdi-upload"
        variant="tonal"
        :loading="isLoading"
        aria-label="Импортировать GPX"
        @click="openFileDialog"
      />
    </v-app-bar>

    <v-main class="app-main">
      <input
        ref="fileInput"
        type="file"
        accept=".gpx,application/gpx+xml"
        class="file-input"
        @change="handleFileChange"
      />

      <v-alert v-if="error" type="error" variant="tonal" class="import-error">
        {{ error }}
      </v-alert>

      <router-view />
    </v-main>
  </v-app>
</template>
<style scoped>
.file-input {
  display: none;
}

.import-error {
  margin: 16px 24px 0;
}

.import-button--mobile {
  display: none;
}

.app {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.app-main {
  min-height: 0 !important;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 600px) {
  .app-bar {
    height: 48px !important;
  }

  :deep(.v-main) {
    padding-top: 48px !important;
  }

  :deep(.app-bar .v-toolbar__content) {
    height: 48px !important;
    min-height: 48px !important;
  }

  .app-title {
    font-size: 16px;
  }

  .import-button--desktop {
    display: none;
  }

  .import-button--mobile {
    display: inline-flex;
    width: 36px;
    height: 36px;
    margin-right: 8px !important;
  }

  .import-error {
    margin: 8px 10px 0;
  }

  .app-main {
    min-height: 0 !important;
    overflow: hidden;
  }
}
</style>
