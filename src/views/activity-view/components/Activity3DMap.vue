<script setup lang="ts">
import { ref } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useActivityMap3D } from '@/hooks/useActivityMap.ts';

type Props = {
  activity: IActivity;
};

const props = defineProps<Props>();

const mapContainer = ref<HTMLDivElement | null>(null);

const { setPlaybackTime, setViewMode, setMapStyle, setFollowCamera } = useActivityMap3D(
  props.activity,
  mapContainer,
);

defineExpose({
  setPlaybackTime,
  setViewMode,
  setMapStyle,
  setFollowCamera,
});
</script>

<template>
  <div class="activity-map-3d-wrapper">
    <div ref="mapContainer" class="activity-map-3d" />
  </div>
</template>

<style scoped>
.activity-map-3d-wrapper {
  position: relative;
  width: 100%;
}
.activity-map-3d {
  width: 100%;
  height: clamp(420px, 65vh, 629px);
  overflow: hidden;
  border-radius: 10px;
}
:deep(.maplibregl-ctrl) {
  display: none !important;
}
@media (max-width: 600px) {
  .activity-map-3d {
    flex: 1 1 auto;
    min-height: 0;
    height: 56dvh;
    max-height: 560px;
    border-radius: 8px;
  }
}
</style>
