<script setup lang="ts">
import { computed } from 'vue';

import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import {
  buildElevationAreaPath,
  buildElevationLinePath,
  buildElevationPoints,
  downsampleElevationPoints,
  getElevationChartSegments,
  getElevationColor,
  getElevationProgressPoint,
  getElevationStats,
  getElevationSvgPoint,
  getElevationSvgPoints,
  getGradeColor,
  type IElevationDisplayMode,
  type IElevationChartSegment,
  smoothElevationPoints,
} from '@/entities/activity/model/elevation-profile.ts';

type Props = {
  activity: IActivity;
  currentTimeSeconds: number;
};

type IDisplaySegment = IElevationChartSegment & {
  color: string;
  areaPath: string;
};

const props = defineProps<Props>();

const width = 1000;
const height = 68;
const padding = 5;

const SMOOTHING_WINDOW_SIZE = 7;
const MAX_CHART_POINTS = 500;

const displayMode = defineModel<IElevationDisplayMode>({
  default: 'elevation',
});

const elevationPoints = computed(() => buildElevationPoints(props.activity.track));

const smoothedElevationPoints = computed(() =>
  smoothElevationPoints(elevationPoints.value, SMOOTHING_WINDOW_SIZE),
);

const elevationStats = computed(() => getElevationStats(smoothedElevationPoints.value));

const elevationRange = computed(() => ({
  min: elevationStats.value.minElevation,
  max: elevationStats.value.maxElevation,
}));

const totalDistanceMeters = computed(
  () =>
    smoothedElevationPoints.value[smoothedElevationPoints.value.length - 1]?.distanceMeters ?? 0,
);

const chartPoints = computed(() =>
  downsampleElevationPoints(smoothedElevationPoints.value, MAX_CHART_POINTS),
);

const svgPoints = computed(() =>
  getElevationSvgPoints(
    chartPoints.value,
    elevationRange.value.min,
    elevationRange.value.max,
    width,
    height,
    padding,
  ),
);

const linePath = computed(() => buildElevationLinePath(svgPoints.value));

const areaPath = computed(() => buildElevationAreaPath(svgPoints.value, height, padding));

const chartSegments = computed(() => getElevationChartSegments(chartPoints.value, svgPoints.value));

const displaySegments = computed<IDisplaySegment[]>(() =>
  chartSegments.value.map((segment) => ({
    ...segment,
    color: getSegmentColor(segment),
    areaPath: getSegmentAreaPath(segment),
  })),
);

const currentPoint = computed(() => {
  const point = getElevationProgressPoint(
    props.activity.track,
    smoothedElevationPoints.value,
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

const isClassic = computed(() => displayMode.value === 'classic');

const isAscentDescent = computed(() => displayMode.value === 'ascent-descent');

const isElevation = computed(() => displayMode.value === 'elevation');

const isGrade = computed(() => displayMode.value === 'grade');

function getSegmentColor(segment: IElevationChartSegment): string {
  if (isAscentDescent.value) {
    if (segment.elevationDelta > 0) {
      return '#e57373';
    }

    if (segment.elevationDelta < 0) {
      return '#1976d2';
    }

    return '#9e9e9e';
  }

  if (isElevation.value) {
    return getElevationColor(
      segment.startElevation,
      elevationRange.value.min,
      elevationRange.value.max,
    );
  }

  if (isGrade.value) {
    return getGradeColor(segment.gradePercent);
  }

  return '#1976d2';
}

function getSegmentAreaPath(segment: IElevationChartSegment): string {
  const bottom = height - padding;
  return [
    `M ${segment.start.x} ${bottom}`,
    `L ${segment.start.x} ${segment.start.y}`,
    `L ${segment.end.x} ${segment.end.y}`,
    `L ${segment.end.x} ${bottom}`,
    'Z',
  ].join(' ');
}
</script>

<template>
  <div class="elevation-profile">
    <div class="elevation-profile__chart-wrapper">
      <svg
        class="elevation-profile__chart"
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
      >
        <template v-if="isClassic">
          <path v-if="areaPath" :d="areaPath" class="elevation-profile__area" />
          <path v-if="linePath" :d="linePath" class="elevation-profile__line" fill="none" />
        </template>

        <template v-else>
          <template v-for="(segment, index) in displaySegments" :key="index">
            <path :d="segment.areaPath" :fill="segment.color" fill-opacity="0.12" />

            <line
              :x1="segment.start.x"
              :y1="segment.start.y"
              :x2="segment.end.x"
              :y2="segment.end.y"
              :stroke="segment.color"
              stroke-width="1"
              stroke-linecap="round"
            />
          </template>
        </template>
      </svg>

      <div
        v-if="currentPoint"
        class="elevation-profile__marker"
        :style="{
          left: `${(currentPoint.x / width) * 100}%`,
          top: `${(currentPoint.y / height) * 100}%`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.elevation-profile {
  width: 100%;
}

.elevation-profile__chart-wrapper {
  position: relative;
  width: 100%;
  height: 68px;
}

.elevation-profile__chart {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.elevation-profile__area {
  fill: rgba(25, 118, 210, 0.12);
}

.elevation-profile__line {
  stroke: #1976d2;
  stroke-width: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.elevation-profile__marker {
  position: absolute;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border: 2px solid #1976d2;
  border-radius: 50%;
  background: #ffffff;
  box-sizing: border-box;
  pointer-events: none;
}
</style>
