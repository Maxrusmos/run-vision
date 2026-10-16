<script setup lang="ts">
import { computed } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import {
  formatActivityDate,
  formatClockDuration,
  formatPlaybackDistance,
} from '@/shared/lib/formatters/formatters';
import GpxImportButton from '@/components/gpx-import/GpxImportButton.vue';

const props = defineProps<{
  activity: IActivity;
}>();

// Без времени в GPX нет ни даты, ни длительности — показываем только дистанцию.
const details = computed(() =>
  [
    props.activity.hasTimestamps ? formatActivityDate(props.activity.startedAt) : null,
    `${formatPlaybackDistance(props.activity.distanceMeters)} км`,
    props.activity.durationSeconds > 0 ? formatClockDuration(props.activity.durationSeconds) : null,
  ]
    .filter(Boolean)
    .join(' · '),
);
</script>

<template>
  <div class="activity-summary">
    <div class="activity-summary__icon">
      <v-icon icon="mdi-map-marker-path" size="22" />
    </div>

    <div class="activity-summary__info">
      <span class="activity-summary__name">{{ activity.name || 'Тренировка' }}</span>
      <span class="activity-summary__details">{{ details }}</span>
    </div>

    <GpxImportButton compact variant="text" size="small" label="Загрузить другой GPX" />
  </div>
</template>

<style scoped>
.activity-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

.activity-summary__icon {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.activity-summary__info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.activity-summary__name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-summary__details {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
}
</style>
