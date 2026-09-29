<script setup lang="ts">
import type { IActivityMetrics } from '@/entities/activity/model/activity-metrics';
import { formatPlaybackDistance } from '@/shared/lib/formatters/formatters';

type Props = {
  metrics: IActivityMetrics;
};

defineProps<Props>();
</script>

<template>
  <div class="metrics-block">
    <div class="metric">
      <span class="metric__value metric__value--distance">
        {{
          `${formatPlaybackDistance(metrics.currentDistanceMeters)} / ${formatPlaybackDistance(metrics.totalDistanceMeters)} км`
        }}
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
  min-width: 90px;
}

.metric__value--distance {
  width: 5ch;
  text-align: right;
}
</style>
