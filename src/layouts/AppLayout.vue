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
  <v-app>
    <v-app-bar flat border="bottom">
      <v-app-bar-title class="app-title"> RunVision </v-app-bar-title> <v-spacer />
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

    <v-main>
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

@media (max-width: 600px) {
  .import-button--desktop {
    display: none;
  }

  .import-button--mobile {
    display: inline-flex;
    width: 40px;
    height: 40px;
  }

  .import-error {
    margin: 12px 12px 0;
  }

  .app-title {
    font-size: 18px;
  }
}
</style>
