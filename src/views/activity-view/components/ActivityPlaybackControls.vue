<script setup lang="ts">
import { computed } from 'vue';

import ActivityElevationProfile from './ActivityElevationProfile.vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import { ICONS } from '@/shared/constants/icons';
import { formatDuration } from '@/shared/lib/formatters/formatters';

type Props = {
  activity: IActivity;
  currentTimeSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  play: [];
  pause: [];
  seek: [seconds: number];
}>();

const progress = computed(() => {
  if (props.durationSeconds <= 0) {
    return 0;
  }

  return props.currentTimeSeconds / props.durationSeconds;
});

function handleSeek(value: number | number[]) {
  const progress = Array.isArray(value) ? value[0] : value;

  if (progress === undefined) {
    return;
  }

  emit('seek', progress * props.durationSeconds);
}
</script>

<template>
  <div class="playback-controls">
    <div class="playback-controls__grid">
      <div class="playback-controls__elevation">
        <ActivityElevationProfile :activity="activity" :current-time-seconds="currentTimeSeconds" />
      </div>

      <v-btn
        class="playback-controls__play"
        icon
        variant="text"
        size="small"
        @click="isPlaying ? emit('pause') : emit('play')"
      >
        <v-icon>
          {{ isPlaying ? ICONS.pause : ICONS.play }}
        </v-icon>
      </v-btn>

      <span class="playback-controls__current-time time">
        {{ formatDuration(currentTimeSeconds) }}
      </span>

      <v-slider
        class="playback-controls__slider"
        :model-value="progress"
        :min="0"
        :max="1"
        :step="0.001"
        hide-details
        @update:model-value="handleSeek"
      />

      <span class="playback-controls__duration time">
        {{ formatDuration(durationSeconds) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.playback-controls {
  width: 100%;
  padding: 12px 0;
}

.playback-controls__grid {
  display: grid;
  grid-template-columns: auto 42px minmax(0, 1fr) 42px;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 12px;
}

.playback-controls__elevation {
  grid-column: 3;
  grid-row: 1;
}

.playback-controls__play {
  grid-column: 1;
  grid-row: 2;
}

.playback-controls__current-time {
  grid-column: 2;
  grid-row: 2;
}

.playback-controls__slider {
  grid-column: 3;
  grid-row: 2;
  width: 100%;
}

.playback-controls__duration {
  grid-column: 4;
  grid-row: 2;
  text-align: right;
}

.time {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
</style>
