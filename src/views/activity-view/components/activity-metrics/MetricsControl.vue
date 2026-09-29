<script setup lang="ts">
import { computed } from 'vue';

import type {
  IElevationStats,
  IElevationDisplayMode,
} from '@/entities/activity/model/elevation-profile.ts';
import type { IActivityMetrics } from '@/entities/activity/model/activity-metrics.ts';

import PaceCadenceMetrics from './PaceCadenceMetrics.vue';
import HeartRateMetrics from './HeartRateMetrics.vue';
import ElevationMetrics from './ElevationMetrics.vue';
import DistanceMetrics from '@/views/activity-view/components/activity-metrics/DistanceMetrics.vue';

type Props = {
  stats: IElevationStats;
  metrics: IActivityMetrics;
  minElevation: number;
  maxElevation: number;
  modelValue: IElevationDisplayMode;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: IElevationDisplayMode];
}>();

const displayModeOptions = [
  {
    title: 'Классический',
    value: 'classic',
  },
  {
    title: 'Подъём / спуск',
    value: 'ascent-descent',
  },
  {
    title: 'По высоте',
    value: 'elevation',
  },
  {
    title: 'По уклону',
    value: 'grade',
  },
];

const isAscentDescent = computed(() => props.modelValue === 'ascent-descent');
const isElevation = computed(() => props.modelValue === 'elevation');
const isGrade = computed(() => props.modelValue === 'grade');
</script>

<template>
  <div class="metrics-control">
    <div class="metrics-control__groups">
      <PaceCadenceMetrics :metrics="metrics" />
      <DistanceMetrics :metrics="metrics" />
      <HeartRateMetrics :metrics="metrics" />
      <ElevationMetrics :stats="stats" :metrics="metrics" />
    </div>

    <div class="metrics-control__tools">
      <div v-if="isAscentDescent" class="metrics-control__legend">
        <span>
          <i class="dot dot--up" />
          Подъём
        </span>
        <span>
          <i class="dot dot--down" />
          Спуск
        </span>
      </div>

      <div v-if="isElevation" class="metrics-control__legend">
        <span>{{ Math.round(minElevation) }} м</span>
        <div class="gradient gradient--height" />
        <span>{{ Math.round(maxElevation) }} м</span>
      </div>

      <div v-if="isGrade" class="metrics-control__legend">
        <span>-10%</span>
        <div class="gradient gradient--grade" />
        <span>+10%</span>
      </div>

      <v-select
        :model-value="modelValue"
        :items="displayModeOptions"
        item-title="title"
        item-value="value"
        density="compact"
        variant="solo"
        hide-details
        class="metrics-control__select"
        @update:model-value="emit('update:model-value', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.metrics-control {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.metrics-control__groups {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.metrics-control__tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  flex-shrink: 0;
}

.metrics-control__select {
  width: 180px;
}

.metrics-control__legend {
  display: flex;
  align-items: center;
  gap: 8px;

  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--up {
  background: #e57373;
}

.dot--down {
  background: #1976d2;
}

.gradient {
  width: 110px;
  height: 6px;
  border-radius: 3px;
}

.gradient--height {
  background: linear-gradient(to right, hsl(220, 70%, 50%), hsl(120, 70%, 50%), hsl(50, 70%, 50%));
}

.gradient--grade {
  background: linear-gradient(to right, #1976d2, #999, #e57373);
}
</style>
