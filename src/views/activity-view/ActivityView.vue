<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';

import Activity3DMap from '@/views/activity-view/components/Activity3DMap.vue';
import ActivityMap from '@/views/activity-view/components/ActivityMap.vue';
import ActivityPlaybackControls from '@/views/activity-view/components/ActivityPlaybackControls.vue';
import { getPlaybackDuration } from '@/entities/activity/model/activity-playback';
import { useActivityStore } from '@/stores/activity.store';
import ActivityElevationProfile from '@/views/activity-view/components/ActivityElevationProfile.vue';

const route = useRoute();
const activityStore = useActivityStore();

const activeTab = ref('2d');
const currentTimeSeconds = ref(0);
const isPlaying = ref(false);

const activityMap = ref<InstanceType<typeof ActivityMap> | null>(null);

let animationFrameId = 0;
let lastFrameTime = 0;

const activity = computed(() => {
  const id = String(route.params.id);

  return activityStore.getActivity(id);
});

const durationSeconds = computed(() => {
  if (!activity.value) {
    return 0;
  }

  return getPlaybackDuration(activity.value.track);
});

function updateMap() {
  activityMap.value?.setPlaybackTime(currentTimeSeconds.value);
}

function play() {
  if (!activity.value || isPlaying.value) {
    return;
  }

  if (currentTimeSeconds.value >= durationSeconds.value) {
    currentTimeSeconds.value = 0;
  }

  isPlaying.value = true;
  lastFrameTime = performance.now();

  animationFrameId = requestAnimationFrame(animate);
}

function pause() {
  isPlaying.value = false;

  cancelAnimationFrame(animationFrameId);
}

function animate(timestamp: number) {
  if (!isPlaying.value) {
    return;
  }

  const deltaSeconds = (timestamp - lastFrameTime) / 1000;

  lastFrameTime = timestamp;
  currentTimeSeconds.value += deltaSeconds;

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
      <h1 class="text-h4 mb-4">
        {{ activity.name }}
      </h1>

      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="2d"> 2D карта </v-tab>

        <v-tab value="3d"> 3D карта </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="2d">
          <ActivityMap ref="activityMap" :activity="activity" />

          <ActivityElevationProfile
            :activity="activity"
            :current-time-seconds="currentTimeSeconds"
          />

          <ActivityPlaybackControls
            :current-time-seconds="currentTimeSeconds"
            :duration-seconds="durationSeconds"
            :is-playing="isPlaying"
            @play="play"
            @pause="pause"
            @seek="seek"
          />
        </v-window-item>

        <v-window-item value="3d">
          <Activity3DMap />
        </v-window-item>
      </v-window>
    </template>

    <v-alert v-else type="info" variant="tonal"> Пробежка не найдена </v-alert>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}
</style>
