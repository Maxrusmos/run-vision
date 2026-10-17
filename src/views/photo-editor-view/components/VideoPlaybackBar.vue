<script setup lang="ts">
import { computed } from 'vue';
import {
  VIDEO_DURATIONS,
  type VideoDuration,
} from '@/entities/activity/model/activity-share/activity-share-video';

/** Видео в редакторе: запуск точки по треку, перемотка и длительность ролика. */
const props = defineProps<{
  /** Текущее время ролика, секунды. */
  time: number;
  duration: VideoDuration;
  playing: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  seek: [time: number];
  setDuration: [duration: VideoDuration];
}>();

function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `0:${String(whole).padStart(2, '0')}`;
}

const timeLabel = computed(() => `${formatTime(props.time)} / ${formatTime(props.duration)}`);

/** Длительность — одна кнопка по кругу: 5 → 10 → 15 → 20 с. */
function nextDuration() {
  const index = VIDEO_DURATIONS.indexOf(props.duration);
  emit('setDuration', VIDEO_DURATIONS[(index + 1) % VIDEO_DURATIONS.length]!);
}
</script>

<template>
  <div class="video-bar">
    <v-btn
      class="video-bar__play"
      :icon="playing ? 'mdi-pause' : 'mdi-play'"
      color="primary"
      variant="flat"
      size="40"
      :aria-label="playing ? 'Пауза' : 'Воспроизвести'"
      @click="emit('toggle')"
    />

    <v-slider
      class="video-bar__slider"
      :model-value="time"
      :min="0"
      :max="duration"
      :step="0.01"
      color="primary"
      track-color="rgb(var(--v-theme-on-surface))"
      thumb-size="14"
      track-size="4"
      hide-details
      density="compact"
      aria-label="Перемотка"
      @update:model-value="emit('seek', Number($event))"
    />

    <span class="video-bar__time">{{ timeLabel }}</span>

    <v-btn
      class="video-bar__duration"
      variant="tonal"
      size="small"
      prepend-icon="mdi-timer-outline"
      :aria-label="`Длительность видео ${duration} секунд — изменить`"
      @click="nextDuration"
    >
      {{ duration }} с
    </v-btn>
  </div>
</template>

<style scoped>
.video-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  /* Края — по линии меню и карточки (16px). */
  padding: 6px 16px;
  border-top: 1px solid var(--app-border);
}

.video-bar__slider {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.video-bar__time {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.video-bar__duration {
  flex: 0 0 auto;
  letter-spacing: 0;
  text-transform: none;
}

/* На самых узких экранах (iPhone SE) время прячем — его видно по ползунку. */
@media (max-width: 360px) {
  .video-bar__time {
    display: none;
  }
}
</style>
