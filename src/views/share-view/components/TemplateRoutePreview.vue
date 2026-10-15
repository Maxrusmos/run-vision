<script setup lang="ts">
import type { PhotoTemplate } from '@/entities/activity/model/activity-share/activity-share.types';
import TopographicPattern from '@/views/share-view/components/TopographicPattern.vue';

defineProps<{
  templateId: PhotoTemplate['id'];
  /** Точки маршрута для `<polyline>` в системе координат 0..100. */
  routePoints: string;
  primaryLabel: string;
  secondaryLabel: string;
}>();
</script>

<template>
  <div class="route-preview" :class="`route-preview--${templateId}`">
    <TopographicPattern v-if="templateId === 'topographic'" />

    <svg
      v-if="routePoints"
      class="route-preview__route"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Предпросмотр маршрута тренировки"
    >
      <polyline
        :points="routePoints"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div v-else class="route-preview__empty">
      <v-icon icon="mdi-map-marker-path" size="28" />
      <span>Нет данных маршрута</span>
    </div>

    <div class="route-preview__stats">
      <span class="route-preview__primary">{{ primaryLabel }}</span>
      <span class="route-preview__secondary">{{ secondaryLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.route-preview {
  position: absolute;
  inset: 0;
}

.route-preview--minimal {
  background: #17212b;
  color: #fff;
}

.route-preview--topographic {
  background: #dce8d5;
  color: #254b38;
}

.route-preview__route {
  position: absolute;
  z-index: 1;
  inset: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  overflow: visible;
}

.route-preview__empty {
  position: absolute;
  top: 35%;
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  opacity: 0.75;
}

.route-preview__stats {
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 12px;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 7px 4px;
  background: rgb(0 0 0 / 32%);
  color: #fff;
  text-align: center;
}

.route-preview--topographic .route-preview__stats {
  background: rgb(255 255 255 / 82%);
  color: #254b38;
}

.route-preview__primary {
  font-size: 16px;
  font-weight: 700;
}

.route-preview__secondary {
  font-size: 9px;
  opacity: 0.9;
}
</style>
