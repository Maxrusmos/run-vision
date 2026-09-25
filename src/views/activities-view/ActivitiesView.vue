<script setup lang="ts">
import { ref } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import { parseGpx } from '@/entities/activity/parser/gpx.parser.ts';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatTime,
} from '@/shared/lib/formatters/formatters.ts';
import { useActivityStore } from '@/stores/activity.store.ts';

const activity = ref<IActivity | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const activityStore = useActivityStore();

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
    activity.value = parsedActivity;
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
  <div class="activities-page">
    <div class="activities-header">
      <div>
        <h1 class="text-h4">Пробежки</h1>

        <p class="text-body-2 text-medium-emphasis">История тренировок</p>
      </div>

      <div>
        <input
          ref="fileInput"
          type="file"
          accept=".gpx,application/gpx+xml"
          class="file-input"
          @change="handleFileChange"
        />

        <v-btn
          color="primary"
          prepend-icon="mdi-upload"
          :loading="isLoading"
          @click="openFileDialog"
        >
          Импортировать
        </v-btn>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="activity" class="activities-list">
      <v-card
        :key="activity.id"
        class="activity-card"
        variant="outlined"
        :to="`/activity/${activity.id}`"
      >
        <v-card-text>
          <div class="activity-main">
            <div>
              <div class="activity-type">
                {{ activity.name }}
              </div>

              <div class="activity-date text-body-2 text-medium-emphasis">
                {{ formatDate(activity.startedAt) }}
                ·
                {{ formatTime(activity.startedAt) }}–{{ formatTime(activity.finishedAt) }}
              </div>
            </div>

            <div class="activity-distance">
              <span>{{ formatDistance(activity.distanceMeters) }}</span>
              <small>км</small>
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="activity-stats">
            <div>
              <div class="stat-label">Активность</div>

              <div class="stat-value">
                {{ formatDuration(activity.durationSeconds) }}
              </div>
            </div>

            <div>
              <div class="stat-label">Темп</div>

              <div class="stat-value">{{ formatPace(activity.averagePaceSecondsPerKm) }} /км</div>
            </div>

            <v-icon class="activity-arrow" icon="mdi-chevron-right" />
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-card v-else-if="!isLoading" variant="outlined" class="empty-state">
      <v-card-text>
        <div class="text-center text-medium-emphasis">
          Импортируй GPX-файл, чтобы добавить пробежку
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.activities-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
}

.activities-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-card {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.activity-card:hover {
  transform: translateY(-1px);
}

.activity-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.activity-type {
  font-size: 18px;
  font-weight: 600;
}

.activity-date {
  margin-top: 4px;
}

.activity-distance {
  white-space: nowrap;
  font-size: 24px;
  font-weight: 600;
}

.activity-distance small {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 400;
}

.activity-stats {
  display: flex;
  align-items: center;
  gap: 48px;
}

.stat-label {
  margin-bottom: 2px;
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
}

.stat-value {
  font-size: 15px;
  font-weight: 500;
}

.activity-arrow {
  margin-left: auto;
}

.file-input {
  display: none;
}

.empty-state {
  padding: 16px;
}
</style>
