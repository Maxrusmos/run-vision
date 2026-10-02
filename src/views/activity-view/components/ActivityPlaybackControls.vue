<script setup lang="ts">
import { computed, ref } from 'vue';
import ActivityElevationProfile from './activity-elevation/ActivityElevationProfile.vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import {
  buildElevationPoints,
  getElevationStats,
  smoothElevationPoints,
  type IElevationDisplayMode,
} from '@/entities/activity/model/elevation-profile';
import { getActivityMetrics } from '@/entities/activity/model/activity-metrics';
import { ICONS } from '@/shared/constants/icons';
import { formatDuration } from '@/shared/lib/formatters/formatters';
import MetricsControl from '@/views/activity-view/components/activity-metrics/MetricsControl.vue';

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
  speed: [speed: number];
}>();

const displayMode = ref<IElevationDisplayMode>('elevation');
const playbackSpeed = ref(2);
const playbackSpeeds = [1, 2, 4, 8, 16, 32, 64, 128];

const elevationPoints = computed(() => buildElevationPoints(props.activity.track));
const smoothedElevationPoints = computed(() => smoothElevationPoints(elevationPoints.value, 7));
const elevationStats = computed(() => getElevationStats(smoothedElevationPoints.value));

const activityMetrics = computed(() =>
  getActivityMetrics(props.activity.track, props.currentTimeSeconds),
);

const elevationRange = computed(() => ({
  min: elevationStats.value.minElevation,
  max: elevationStats.value.maxElevation,
}));

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

function handleSpeedChange(speed: number) {
  playbackSpeed.value = speed;
  emit('speed', speed);
}
</script>

<template>
  <div class="playback-controls">
    <MetricsControl
      class="playback-controls__elevation-controls"
      :stats="elevationStats"
      :metrics="activityMetrics"
      :min-elevation="elevationRange.min"
      :max-elevation="elevationRange.max"
      v-model="displayMode"
    />

    <div class="playback-controls__grid">
      <div class="playback-controls__elevation">
        <ActivityElevationProfile
          v-model="displayMode"
          :activity="activity"
          :current-time-seconds="currentTimeSeconds"
        />
      </div>

      <v-menu location="top" offset="4">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" class="playback-controls__speed" variant="text" size="x-small">
            {{ playbackSpeed }}×
          </v-btn>
        </template>

        <v-list density="compact">
          <v-list-item
            v-for="speed in playbackSpeeds"
            :key="speed"
            :active="speed === playbackSpeed"
            @click="handleSpeedChange(speed)"
          >
            <v-list-item-title> {{ speed }}× </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

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

.playback-controls__elevation-controls {
  width: 100%;
  margin-bottom: 8px;
}

.playback-controls__elevation {
  grid-column: 3;
  grid-row: 1;
}

.playback-controls__play {
  grid-column: 1;
  grid-row: 2;
  position: relative;
}

.playback-controls__grid {
  position: relative;
  display: grid;
  grid-template-columns: auto 42px minmax(0, 1fr) 42px;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 12px;
}

.playback-controls__speed {
  position: absolute;
  left: 48px;
  bottom: 40px;
  min-width: 36px;
  padding: 0;
  font-size: 14px;
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

.playback-controls__current-time,
.playback-controls__duration {
  width: 32px;
  min-width: 32px;
}

@media (max-width: 600px) {
  .playback-controls {
    padding: 8px 0;
  }

  .playback-controls__elevation-controls {
    margin-bottom: 4px;
  }

  .playback-controls__grid {
    grid-template-columns: 40px auto minmax(0, 1fr) auto;
    grid-template-rows: 56px 40px 32px;
    column-gap: 6px;
    row-gap: 2px;
  }

  .playback-controls__elevation {
    grid-column: 2 / -1;
    grid-row: 1;
    min-width: 0;
  }

  .playback-controls__play {
    grid-column: 1;
    grid-row: 2;
    width: 40px;
    height: 40px;
  }

  .playback-controls__current-time {
    grid-column: 2;
    grid-row: 2;
    white-space: nowrap;
  }

  .playback-controls__slider {
    grid-column: 3;
    grid-row: 2;
    width: 100%;
    margin: 0;
  }

  .playback-controls__duration {
    grid-column: 4;
    grid-row: 2;
    text-align: right;
    white-space: nowrap;
  }

  .playback-controls__speed {
    position: absolute;
    top: 32px;
    left: 2px;
    height: 28px;
    padding: 0;
    font-size: 13px;
  }

  .time {
    font-size: 12px;
  }
}
</style>
