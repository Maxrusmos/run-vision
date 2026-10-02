<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import Activity3DMap from '@/views/activity-view/components/Activity3DMap.vue';
import ActivityMapControls from '@/views/activity-view/components/ActivityMapControls.vue';
import ActivityPlaybackControls from '@/views/activity-view/components/ActivityPlaybackControls.vue';
import { getPlaybackDuration } from '@/entities/activity/model/activity-playback';
import { useActivityStore } from '@/stores/activity.store';

type ViewMode = '2d' | '3d';
type MapStyle = 'map' | 'satellite';

const activityStore = useActivityStore();

const currentTimeSeconds = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(2);

const viewMode = ref<ViewMode>('3d');
const mapStyle = ref<MapStyle>('map');
const followCamera = ref(false);

const activity3DMap = ref<InstanceType<typeof Activity3DMap> | null>(null);

let animationFrameId = 0;
let lastFrameTime = 0;

const activity = computed(() => activityStore.activity);

const durationSeconds = computed(() => {
  if (!activity.value) {
    return 0;
  }
  return getPlaybackDuration(activity.value.track);
});

function setViewMode(mode: ViewMode) {
  viewMode.value = mode;
  activity3DMap.value?.setViewMode(mode);
}

function setMapStyle(style: MapStyle) {
  mapStyle.value = style;
  activity3DMap.value?.setMapStyle(style);
}

function setFollowCamera(enabled: boolean) {
  followCamera.value = enabled;
  activity3DMap.value?.setFollowCamera(enabled);
}

function updateMap() {
  activity3DMap.value?.setPlaybackTime(currentTimeSeconds.value);
}

async function syncActivity() {
  currentTimeSeconds.value = 0;

  await nextTick();

  activity3DMap.value?.setPlaybackTime(0);
  activity3DMap.value?.setViewMode(viewMode.value);
  activity3DMap.value?.setMapStyle(mapStyle.value);
  activity3DMap.value?.setFollowCamera(followCamera.value);
}

watch(
  () => activity.value?.id,
  async (id, previousId) => {
    if (!id || id === previousId) {
      return;
    }

    await syncActivity();
  },
);
function changePlaybackSpeed(speed: number) {
  playbackSpeed.value = speed;
}

function play() {
  if (!activity.value || isPlaying.value) {
    return;
  }
  if (currentTimeSeconds.value >= durationSeconds.value) {
    currentTimeSeconds.value = 0;
    updateMap();
  }
  isPlaying.value = true;
  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(animate);
}

function pause() {
  isPlaying.value = false;
  cancelAnimationFrame(animationFrameId);
  lastFrameTime = 0;
}

function animate(timestamp: number) {
  if (!isPlaying.value) {
    return;
  }
  const deltaSeconds = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  currentTimeSeconds.value += deltaSeconds * playbackSpeed.value;
  if (currentTimeSeconds.value >= durationSeconds.value) {
    currentTimeSeconds.value = durationSeconds.value;
    isPlaying.value = false;
    updateMap();
    return;
  }
  updateMap();
  animationFrameId = requestAnimationFrame(animate);
}

function seek(seconds: number) {
  currentTimeSeconds.value = Math.min(Math.max(seconds, 0), durationSeconds.value);
  updateMap();
}

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div class="page">
    <template v-if="activity">
      <div class="activity-header">
        <ActivityMapControls
          :view-mode="viewMode"
          :map-style="mapStyle"
          :follow-camera="followCamera"
          @update:view-mode="setViewMode"
          @update:map-style="setMapStyle"
          @update:follow-camera="setFollowCamera"
        />
      </div>

      <Activity3DMap :key="activity.id" ref="activity3DMap" :activity="activity" />

      <ActivityPlaybackControls
        :activity="activity"
        :current-time-seconds="currentTimeSeconds"
        :duration-seconds="durationSeconds"
        :is-playing="isPlaying"
        @play="play"
        @pause="pause"
        @seek="seek"
        @speed="changePlaybackSpeed"
      />
    </template>

    <template v-else>
      <div class="empty-state">
        <div class="empty-content">
          <v-icon icon="mdi-run" size="64" class="mb-4" />

          <h2 class="text-h5 mb-2">Нет тренировки</h2>

          <p class="text-body-2 text-medium-emphasis">
            Нажмите «Импортировать GPX» в правом верхнем углу, чтобы открыть тренировку.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  width: 100%;
  max-width: 100%;
  padding: 16px;
  overflow-x: hidden;
}
.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 4px 0 12px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
.empty-content {
  width: 100%;
  max-width: 420px;
  text-align: center;
}

@media (max-width: 600px) {
  .page {
    padding: 10px;
  }
  .activity-header {
    gap: 8px;
    margin-bottom: 8px;
  }
  .empty-state {
    min-height: calc(100dvh - 120px);
    padding: 16px;
  }
  .empty-content {
    max-width: 320px;
  }
}
</style>
