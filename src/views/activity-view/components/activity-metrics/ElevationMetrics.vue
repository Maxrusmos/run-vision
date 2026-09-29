<script setup lang="ts">
import type { IElevationStats } from '@/entities/activity/model/elevation-profile.ts';
import type { IActivityMetrics } from '@/entities/activity/model/activity-metrics.ts';
import { formatElevation, formatGrade } from '@/shared/lib/formatters/formatters.ts';

type Props = {
  stats: IElevationStats;
  metrics: IActivityMetrics;
};

defineProps<Props>();
</script>

<template>
  <div class="metrics-block">
    <div class="metric">
      <span class="metric__label">⛰</span>
      <span class="metric__value metric__value--elevation">
        {{ formatElevation(metrics.currentElevation) }}
      </span>
    </div>

    <div class="metric">
      <span class="metric__label">↗</span>
      <span class="metric__value metric__value--grade">
        {{ formatGrade(metrics.currentGradePercent) }}
      </span>
    </div>

    <div class="metric">
      <span class="metric__label">↑</span>
      <span class="metric__value metric__value--total">
        {{ Math.round(stats.totalAscentMeters) }} м
      </span>
    </div>

    <div class="metric">
      <span class="metric__label">↓</span>
      <span class="metric__value metric__value--total">
        {{ Math.round(stats.totalDescentMeters) }} м
      </span>
    </div>
  </div>
</template>

<style scoped>
.metrics-block {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.metric {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 80px;
}

.metric__label {
  color: rgba(255, 255, 255, 0.65);
}

.metric__value {
  display: inline-block;
  font-weight: 500;
  text-align: right;
}
</style>
