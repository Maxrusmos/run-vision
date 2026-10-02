<script setup lang="ts">
import { ref, watch } from 'vue';
import type { IActivityMetrics } from '@/entities/activity/model/activity-metrics.ts';
import { formatHeartRate } from '@/shared/lib/formatters/formatters.ts';

type Props = {
  metrics: IActivityMetrics;
};

const props = defineProps<Props>();
const isHeartBeating = ref(false);

watch(
  () => props.metrics.currentHeartRate,
  (value, previousValue) => {
    if (value === null || value === previousValue) {
      return;
    }
    isHeartBeating.value = false;
    requestAnimationFrame(() => {
      isHeartBeating.value = true;
    });
  },
);
</script>

<template>
  <div class="metrics-block">
    <div class="metric metric--current">
      <span
        class="heart"
        :class="{ 'heart--beating': isHeartBeating }"
        @animationend="isHeartBeating = false"
      >
        ♥
      </span>

      <span class="metric__value metric__value--heart-rate">
        {{ formatHeartRate(metrics.currentHeartRate) }}
      </span>
    </div>

    <div class="metric metric--muted">
      <span class="metric__label">ср.</span>

      <span class="metric__value">
        {{ formatHeartRate(metrics.averageHeartRate) }}
      </span>
    </div>

    <div class="metric metric--muted max-heart">
      <span class="metric__label">макс.</span>

      <span class="metric__value">
        {{ formatHeartRate(metrics.maxHeartRate) }}
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

.metric__value--heart-rate {
  min-width: 3ch;
  text-align: right;
}

.metric--muted .metric__value {
  color: rgba(255, 255, 255, 0.55);
}

.heart {
  display: inline-block;
  font-size: 19px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.65);
  transform-origin: center;
}

.heart--beating {
  animation: heartbeat 520ms ease-in-out;
}

@keyframes heartbeat {
  0% {
    color: rgba(255, 255, 255, 0.65);
    transform: scale(1);
  }

  20% {
    color: #ff3b30;
    transform: scale(1.15);
  }

  38% {
    color: #ff3b30;
    transform: scale(1.4);
  }

  55% {
    color: #ff3b30;
    transform: scale(1.08);
  }

  72% {
    color: rgba(255, 120, 115, 0.85);
    transform: scale(1.02);
  }

  100% {
    color: rgba(255, 255, 255, 0.65);
    transform: scale(1);
  }
}

@media (max-width: 600px) {
  .metrics-block {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 6px 8px;
    font-size: 12px;
  }

  .metric {
    min-width: 0;
    justify-content: center;
    align-items: center;
    gap: 3px;
  }

  .metric__label {
    font-size: 14px;
  }

  .metric__value {
    font-size: 14px;
  }

  .metric__value--heart-rate {
    min-width: 0;
  }

  .heart {
    font-size: 16px;
  }

  .max-heart {
    display: none;
  }
}
</style>
