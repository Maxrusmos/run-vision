<script setup lang="ts">
import { computed } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';

export type PhotoTemplate = 'minimal' | 'topographic' | 'custom';

const selected = defineModel<PhotoTemplate>({
  default: 'minimal',
});

const props = defineProps<{
  activity: IActivity;
}>();

const templates = [
  {
    value: 'minimal',
    title: 'Минимализм',
    description: 'Маршрут и главные цифры',
  },
  {
    value: 'topographic',
    title: 'Топография',
    description: 'Карта и рельеф',
  },
] as const;

const routePoints = computed(() => {
  const track = props.activity.track;

  if (track.length === 0) {
    return '';
  }

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of track) {
    if (!Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
      continue;
    }

    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }

  if (
    !Number.isFinite(minLon) ||
    !Number.isFinite(maxLon) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat)
  ) {
    return '';
  }

  const midLat = (minLat + maxLat) / 2;
  const longitudeScale = Math.max(Math.cos((midLat * Math.PI) / 180), 0.01);
  const rawWidth = Math.max((maxLon - minLon) * longitudeScale, 1e-9);
  const rawHeight = Math.max(maxLat - minLat, 1e-9);
  const padding = 12;
  const availableSize = 100 - padding * 2;
  const scale = availableSize / Math.max(rawWidth, rawHeight);
  const width = rawWidth * scale;
  const height = rawHeight * scale;
  const offsetX = (100 - width) / 2;
  const offsetY = (100 - height) / 2;

  return track
    .filter((point) => Number.isFinite(point.longitude) && Number.isFinite(point.latitude))
    .map((point) => {
      const x = offsetX + (point.longitude - minLon) * longitudeScale * scale;

      const y = 100 - offsetY - (point.latitude - minLat) * scale;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
});

const distanceLabel = computed(() => {
  const distance = props.activity.distanceMeters;

  if (!Number.isFinite(distance) || distance < 0) {
    return '—';
  }

  return `${(distance / 1000).toFixed(2)} км`;
});

const durationLabel = computed(() => {
  const duration = props.activity.durationSeconds;

  if (!Number.isFinite(duration) || duration < 0) {
    return '—';
  }

  const totalSeconds = Math.round(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const paceLabel = computed(() => {
  const pace = props.activity.averagePaceSecondsPerKm;

  if (!Number.isFinite(pace) || pace <= 0) {
    return '—';
  }

  const totalSeconds = Math.round(pace);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')} /км`;
});
</script>

<template>
  <section class="templates-section">
    <div class="section-heading">
      <h3 class="section-title">Выбери стиль</h3>
      <p class="section-description">Выбери готовый дизайн или создай собственный</p>
    </div>

    <v-slide-group
      :model-value="selected"
      show-arrows="desktop"
      class="template-carousel"
      @update:model-value="
        (value) => {
          if (value === 'minimal' || value === 'topographic' || value === 'custom') {
            selected = value;
          }
        }
      "
    >
      <v-slide-group-item
        v-for="template in templates"
        :key="template.value"
        :value="template.value"
      >
        <button
          type="button"
          class="template-card"
          :class="{
            'template-card--active': selected === template.value,
          }"
          :aria-pressed="selected === template.value"
          @click="selected = template.value"
        >
          <div class="template-preview" :class="`template-preview--${template.value}`">
            <div
              v-if="template.value === 'topographic'"
              class="topographic-pattern"
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M-10 20 C10 0 30 40 50 20 S80 0 110 25"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.5"
                />
                <path
                  d="M-10 32 C10 12 30 52 50 32 S80 12 110 37"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.5"
                />
                <path
                  d="M-10 65 C15 45 35 85 55 65 S85 45 110 70"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.5"
                />
                <path
                  d="M-10 77 C15 57 35 97 55 77 S85 57 110 82"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.5"
                />
              </svg>
            </div>

            <svg
              v-if="routePoints"
              class="route-preview"
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

            <div v-else class="empty-route">
              <v-icon icon="mdi-map-marker-path" size="28" />
              <span>Нет данных маршрута</span>
            </div>

            <v-icon
              v-if="selected === template.value"
              class="preview-check"
              icon="mdi-check-circle"
              color="primary"
              size="22"
            />

            <div class="preview-stats">
              <span class="preview-distance">
                {{ distanceLabel }}
              </span>
              <span class="preview-secondary"> {{ durationLabel }} · {{ paceLabel }} </span>
            </div>
          </div>

          <span class="template-title">
            {{ template.title }}
          </span>

          <span class="template-description">
            {{ template.description }}
          </span>
        </button>
      </v-slide-group-item>

      <v-slide-group-item value="custom">
        <button
          type="button"
          class="template-card"
          :class="{
            'template-card--active': selected === 'custom',
          }"
          :aria-pressed="selected === 'custom'"
          @click="selected = 'custom'"
        >
          <div class="custom-preview">
            <v-icon icon="mdi-plus-circle-outline" size="38" />
            <span class="custom-title"> Твой дизайн </span>
            <span class="custom-caption"> Настрой всё под себя </span>
          </div>
          <span class="template-title"> Свой вариант </span>
          <span class="template-description"> Собственное оформление </span>
        </button>
      </v-slide-group-item>
    </v-slide-group>
  </section>
</template>

<style scoped>
.templates-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 24px;
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.section-description {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
}

.template-carousel {
  width: 100%;
}

.template-card {
  display: flex;
  width: 164px;
  height: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin-right: 12px;
  padding: 0 0 8px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--app-on-surface);
  text-align: left;
  cursor: pointer;
}

.template-card:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 3px;
}

.template-preview,
.custom-preview {
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 3 / 4;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.template-preview--minimal {
  background: #17212b;
  color: #fff;
}

.template-preview--topographic {
  background: #dce8d5;
  color: #254b38;
}

.topographic-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.4;
}

.topographic-pattern svg {
  width: 100%;
  height: 100%;
}

.route-preview {
  position: absolute;
  z-index: 1;
  inset: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  overflow: visible;
}

.empty-route {
  position: absolute;
  top: 35%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  opacity: 0.75;
}

.preview-stats {
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

.template-preview--topographic .preview-stats {
  background: rgb(255 255 255 / 82%);
  color: #254b38;
}

.preview-distance {
  font-size: 16px;
  font-weight: 700;
}

.preview-secondary {
  font-size: 9px;
  opacity: 0.9;
}

.preview-check {
  position: absolute;
  z-index: 3;
  top: 8px;
  right: 8px;
  border-radius: 50%;
}

.template-card--active .template-preview,
.template-card--active .custom-preview {
  outline: 2px solid var(--app-primary);
  outline-offset: -2px;
}

.template-title {
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.template-description {
  padding: 0 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 12px;
  line-height: 1.4;
}

.custom-preview {
  border: 1px dashed var(--app-border);
  background: color-mix(in srgb, var(--app-on-surface) 2.5%, transparent);
  color: var(--app-primary);
}

.custom-title {
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.custom-caption {
  padding: 0 12px;
  color: var(--app-on-surface);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 600px) {
  .templates-section {
    padding: 20px 16px;
  }

  .template-card {
    width: 148px;
  }
}
</style>
