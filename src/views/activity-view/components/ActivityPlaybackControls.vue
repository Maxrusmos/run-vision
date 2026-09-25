<script setup lang="ts">
import { computed } from 'vue';
import { ICONS } from '../../../shared/constants/icons.ts';

type Props = {
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

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
</script>

<template>
  <div class="playback-controls">
    <v-btn icon variant="text" size="small" @click="isPlaying ? emit('pause') : emit('play')">
      <v-icon>
        {{ isPlaying ? ICONS.pause : ICONS.play }}
      </v-icon>
    </v-btn>

    <div class="playback-controls__timeline">
      <span class="time">
        {{ formatTime(currentTimeSeconds) }}
      </span>

      <v-slider
        :model-value="progress"
        :min="0"
        :max="1"
        :step="0.001"
        hide-details
        @update:model-value="handleSeek"
      />

      <span class="time">
        {{ formatTime(durationSeconds) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.playback-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.playback-controls__timeline {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  flex: 1;
}

.time {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.playback-controls__timeline .time:last-child {
  text-align: right;
}

.playback-controls__timeline :deep(.v-slider) {
  width: 100%;
}
</style>
