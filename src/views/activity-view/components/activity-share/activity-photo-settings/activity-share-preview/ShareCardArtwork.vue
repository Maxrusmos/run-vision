<script setup lang="ts">
import { computed, ref } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import type { ShareStatKey } from '@/entities/activity/model/activity-share/activity-share.types.ts';
import { getActivityShareStat } from '@/entities/activity/model/activity-share/activity-share-stats.ts';

const props = defineProps<{
  activity: IActivity;
  backgroundColor: string;
  routeColor: string;
  textColor: string;
  visibleStats: ShareStatKey[];
}>();

const svgRef = ref<SVGSVGElement | null>(null);

defineExpose({ svgRef });

const routePoints = computed(() => {
  const track = props.activity.track;

  if (track.length === 0) return '';

  const longitudes = track.map((point) => point.longitude);
  const latitudes = track.map((point) => point.latitude);

  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  const width = 600;
  const height = 300;
  const padding = 30;

  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  const scale = Math.min((width - padding * 2) / lonRange, (height - padding * 2) / latRange);

  const routeWidth = lonRange * scale;
  const routeHeight = latRange * scale;
  const offsetX = (width - routeWidth) / 2;
  const offsetY = (height - routeHeight) / 2;

  return track
    .map((point) => {
      const x = offsetX + (point.longitude - minLon) * scale;
      const y = height - offsetY - (point.latitude - minLat) * scale;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
});

const stats = computed(() =>
  props.visibleStats.map((key) => ({
    key,
    ...getActivityShareStat(props.activity, key),
  })),
);

const activityDate = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(props.activity.startedAt)),
);
</script>

<template>
  <div
    class="artwork"
    :style="{
      '--share-background': backgroundColor,
      '--share-route': routeColor,
      '--share-text': textColor,
    }"
  >
    <div class="artwork__heading">
      <div class="artwork__meta">
        <span class="artwork__brand">RUNVISION</span>
        <span class="artwork__date">{{ activityDate }}</span>
      </div>

      <div class="artwork__title">
        {{ activity.name || 'Тренировка' }}
      </div>
    </div>

    <div class="artwork__route">
      <svg
        ref="svgRef"
        viewBox="0 0 600 300"
        role="img"
        aria-label="Маршрут тренировки"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          v-if="routePoints"
          :points="routePoints"
          fill="none"
          :stroke="routeColor"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          v-if="routePoints"
          :cx="Number(routePoints.split(' ')[0]?.split(',')[0] ?? 0)"
          :cy="Number(routePoints.split(' ')[0]?.split(',')[1] ?? 0)"
          r="7"
          :fill="routeColor"
        />
      </svg>
    </div>

    <div class="artwork__stats">
      <div
        v-for="(stat, index) in stats"
        :key="stat.key"
        class="artwork__stat"
        :class="{ 'artwork__stat--primary': index === 0 }"
      >
        <div class="artwork__stat-label">{{ stat.label }}</div>
        <div class="artwork__stat-value">{{ stat.value }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artwork {
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  padding: clamp(16px, 4vw, 32px);
  overflow: hidden;
  color: var(--share-text);
  background: var(--share-background);
  border-radius: 16px;
  font-family: Inter, Arial, sans-serif;
}

.artwork__route svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--share-route);
}

.artwork__stat {
  min-width: 0;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--share-text) 18%, transparent);
  border-radius: 12px;
}

.artwork__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.artwork__brand {
  justify-content: flex-start;
  gap: 9px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.artwork__date {
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.artwork__heading {
  margin-top: 8px;
}

.artwork__title {
  margin-top: 8px;
  overflow-wrap: anywhere;
  font-size: clamp(23px, 5vw, 34px);
  font-weight: 800;
  line-height: 1.15;
}

.artwork__route {
  margin: 20px -8px 12px;
}

.artwork__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.artwork {
  --share-background: #111827;
  --share-route: #ffffff;
  --share-text: #ffffff;

  color: var(--share-text);
  background: var(--share-background);
}

.artwork__route svg {
  color: var(--share-route);
}

.artwork__stat {
  border: 1px solid color-mix(in srgb, var(--share-text) 18%, transparent);
}

.artwork__stat--primary {
  grid-column: 1 / -1;
  padding: 18px;
}

.artwork__stat-label {
  font-size: 11px;
  opacity: 0.7;
}

.artwork__stat-value {
  margin-top: 5px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.artwork__stat--primary .artwork__stat-value {
  font-size: clamp(28px, 6vw, 38px);
}

@media (max-width: 420px) {
  .artwork__date {
    font-size: 9px;
  }

  .artwork__stat {
    padding: 11px;
  }
}
</style>
