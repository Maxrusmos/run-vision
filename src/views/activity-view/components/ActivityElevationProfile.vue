<script setup lang="ts">
import { computed } from 'vue';

import type { IActivity } from '@/entities/activity/model/activity.types';
import {
  buildElevationAreaPath,
  buildElevationLinePath,
  buildElevationPoints,
  getElevationProgressPoint,
  getElevationRange,
  getElevationSvgPoint,
  getElevationSvgPoints,
} from '@/entities/activity/model/elevation-profile';

type Props = {
  activity: IActivity;
  currentTimeSeconds: number;
};

const props = defineProps<Props>();

const width = 1000;
const height = 180;
const padding = 16;

const elevationPoints = computed(() => buildElevationPoints(props.activity.track));

const elevationRange = computed(() => getElevationRange(elevationPoints.value));

const totalDistanceMeters = computed(
  () => elevationPoints.value[elevationPoints.value.length - 1]?.distanceMeters ?? 0,
);

const svgPoints = computed(() =>
  getElevationSvgPoints(
    elevationPoints.value,
    elevationRange.value.min,
    elevationRange.value.max,
    width,
    height,
    padding,
  ),
);

const linePath = computed(() => buildElevationLinePath(svgPoints.value));

const areaPath = computed(() => buildElevationAreaPath(svgPoints.value, height, padding));

const currentPoint = computed(() => {
  const point = getElevationProgressPoint(
    props.activity.track,
    elevationPoints.value,
    props.currentTimeSeconds,
  );

  if (!point) {
    return null;
  }

  return getElevationSvgPoint(
    point,
    totalDistanceMeters.value,
    elevationRange.value.min,
    elevationRange.value.max,
    width,
    height,
    padding,
  );
});

function formatElevation(value: number): string {
  return `${Math.round(value)} м`;
}
</script>

<template>
  <div class="elevation-profile">
    <div class="elevation-profile__header">
      <span class="text-subtitle-2"> Рельеф </span>

      <span class="text-caption">
        {{ formatElevation(elevationRange.min) }}
        —
        {{ formatElevation(elevationRange.max) }}
      </span>
    </div>

    <svg
      class="elevation-profile__chart"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
    >
      <path v-if="areaPath" :d="areaPath" class="elevation-profile__area" />

      <path v-if="linePath" :d="linePath" class="elevation-profile__line" fill="none" />

      <circle
        v-if="currentPoint"
        :cx="currentPoint.x"
        :cy="currentPoint.y"
        r="7"
        class="elevation-profile__marker"
      />
    </svg>
  </div>
</template>

<style scoped>
.elevation-profile {
  width: 100%;
  padding: 16px 0;
}

.elevation-profile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.elevation-profile__chart {
  display: block;
  width: 100%;
  height: 180px;
  overflow: visible;
}

.elevation-profile__area {
  fill: rgba(25, 118, 210, 0.12);
}

.elevation-profile__line {
  stroke: #1976d2;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.elevation-profile__marker {
  fill: #ffffff;
  stroke: #1976d2;
  stroke-width: 3;
}
</style>
