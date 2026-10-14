<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { parseGpx } from '@/entities/activity/parser/gpx.parser.ts';
import { useActivityStore } from '@/stores/activity.store.ts';
import ActivityShareDialog, {
  type ActivityShareSettings,
} from '@/views/activity-view/components/activity-share/ActivityShareDialog.vue';

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

const isShareDialogOpen = ref(false);

function openShareDialog() {
  isShareDialogOpen.value = true;
}

const activity = computed(() => activityStore.activity);

function handleShareConfirm(settings: ActivityShareSettings) {
  console.log('Выбранный тип:', settings.shareType);
  console.log('Выбранный шаблон:', settings.photoTemplate);
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

      <v-btn
        v-if="activity && isActivityPage"
        class="share-button share-button--desktop mr-2"
        color="primary"
        prepend-icon="mdi-share-outline"
        variant="tonal"
        @click="openShareDialog"
      >
        Поделиться
      </v-btn>

      <v-btn
        v-if="activity && isActivityPage"
        class="share-button share-button--mobile share-button--pulse mr-2"
        color="primary"
        prepend-icon="mdi-share-outline"
        variant="flat"
        size="small"
        aria-label="Поделиться тренировкой"
        @click="openShareDialog"
      >
        Поделиться
      </v-btn>
    </v-app-bar>

    <v-main class="app-main">
      <input
        ref="fileInput"
        type="file"
        class="file-input"
        @change="handleFileChange"
        accept=".gpx"
      />

      <v-alert v-if="error" type="error" variant="tonal" class="import-error">
        {{ error }}
      </v-alert>

      <router-view />

      <ActivityShareDialog
        :activity="activity!"
        v-model="isShareDialogOpen"
        @confirm="handleShareConfirm"
      />
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

.share-button--mobile {
  display: none;
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

  .share-button--desktop {
    display: none;
  }

  .share-button--mobile {
    display: inline-flex;
    width: auto;
    height: 36px;
    padding-inline: 12px;
    margin-right: 8px !important;
    flex-shrink: 0;
    font-weight: 500;
    letter-spacing: 0;
  }

  .share-button--pulse {
    animation: share-button-pulse 2.4s ease-in-out infinite;
  }

  .import-error {
    margin: 8px 10px 0;
  }

  .app-main {
    min-height: 0 !important;
    overflow: hidden;
  }
}

@keyframes share-button-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--app-primary), 0);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 0 5px rgba(var(--app-primary), 0.16);
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-button--pulse {
    animation: none;
  }
}
</style>
