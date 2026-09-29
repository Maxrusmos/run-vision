<script setup lang="ts">
import type { IActivityMetrics } from '@/entities/activity/model/activity-metrics.ts';
import { formatPace } from '@/shared/lib/formatters/formatters.ts';

type Props = {
  metrics: IActivityMetrics;
};

defineProps<Props>();
</script>

<template>
  <div class="metrics-block">
    <div class="metric">
      <span class="metric__label">Темп: </span>
      <span class="metric__value">
        {{ formatPace(metrics.currentPaceSecondsPerKm) }}
      </span>
    </div>

    <div class="metric metric--muted">
      <span class="metric__label">ср.</span>
      <span class="metric__value">
        {{ formatPace(metrics.averagePaceSecondsPerKm) }}
      </span>
    </div>

    <div class="metric">
      <span class="metric__label">Каденс: </span>
      <span class="metric__value">
        {{ metrics.currentCadence === null ? '—' : Math.round(metrics.currentCadence) }}
      </span>
    </div>

    <div class="metric metric--muted">
      <span class="metric__label">ср.</span>
      <span class="metric__value">
        {{ metrics.averageCadence === null ? '—' : Math.round(metrics.averageCadence) }}
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
  font-weight: 500;
}

.metric--muted .metric__value {
  color: rgba(255, 255, 255, 0.55);
}
</style>
