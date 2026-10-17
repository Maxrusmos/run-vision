<script setup lang="ts">
import { computed } from 'vue';
import type {
  ShareCardSettings,
  ShareStatKey,
  ShareWidgetKind,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_WIDGETS } from '@/entities/activity/model/activity-share/activity-share-widgets';
import { SHARE_STAT_EMPTY_VALUE } from '@/entities/activity/model/activity-share/activity-share-stats';
import { SHARE_STAT_OPTIONS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

const props = defineProps<{
  settings: ShareCardSettings;
  statValues: Record<ShareStatKey, string>;
}>();

const emit = defineEmits<{
  addTitle: [];
  addRoute: [];
  addStat: [key: ShareStatKey];
  addStats: [keys: ShareStatKey[]];
  addElevation: [];
  addWidget: [kind: ShareWidgetKind];
}>();

/** «Телеметрия»: виджеты, которых нет на карточке. */
const availableWidgets = computed(() => {
  const telemetry = props.settings.telemetry;
  if (!telemetry) return [];
  const hasHeartRate = props.statValues.averageHeartRate !== SHARE_STAT_EMPTY_VALUE;
  return SHARE_WIDGETS.filter(
    (widget) => !telemetry.widgets.some((item) => item.kind === widget.kind),
  ).map((widget) => ({ ...widget, hasData: !widget.needsHeartRate || hasHeartRate }));
});

const availableStats = computed(() =>
  SHARE_STAT_OPTIONS.filter((option) => !props.settings.visibleStats.includes(option.key)).map(
    (option) => ({
      ...option,
      value: props.statValues[option.key],
      // В GPX может не быть пульса, каденса или нужной дистанции.
      hasData: props.statValues[option.key] !== SHARE_STAT_EMPTY_VALUE,
    }),
  ),
);

/** Показатели с данными, которых ещё нет на карточке, — для «Добавить все». */
const addableStats = computed(() =>
  availableStats.value.filter((stat) => stat.hasData).map((stat) => stat.key),
);

const canAddElevation = computed(() => props.settings.elevation?.visible === false);

const hasElements = computed(
  () => !props.settings.titleVisible || !props.settings.routeVisible || canAddElevation.value,
);
</script>

<template>
  <div class="add-panel">
    <div v-if="hasElements" class="add-panel__group">
      <button
        v-if="!settings.titleVisible"
        type="button"
        class="add-panel__item"
        @click="emit('addTitle')"
      >
        <v-icon icon="mdi-format-title" size="18" />
        <span class="add-panel__label">Название</span>
      </button>
      <button
        v-if="!settings.routeVisible"
        type="button"
        class="add-panel__item"
        @click="emit('addRoute')"
      >
        <v-icon icon="mdi-map-marker-path" size="18" />
        <span class="add-panel__label">Трек</span>
      </button>
      <button
        v-if="canAddElevation"
        type="button"
        class="add-panel__item"
        @click="emit('addElevation')"
      >
        <v-icon icon="mdi-chart-areaspline-variant" size="18" />
        <span class="add-panel__label">График высоты</span>
      </button>
    </div>

    <div v-if="availableWidgets.length" class="add-panel__group">
      <button
        v-for="widget in availableWidgets"
        :key="widget.kind"
        type="button"
        class="add-panel__item"
        :disabled="!widget.hasData"
        @click="emit('addWidget', widget.kind)"
      >
        <v-icon :icon="widget.icon" size="18" />
        <span class="add-panel__text">
          <span class="add-panel__label">{{ widget.name }}</span>
          <span class="add-panel__value">{{ widget.hasData ? 'Виджет' : 'Нет данных в GPX' }}</span>
        </span>
      </button>
    </div>

    <button
      v-if="addableStats.length > 1"
      type="button"
      class="add-panel__item add-panel__item--all"
      @click="emit('addStats', addableStats)"
    >
      <v-icon icon="mdi-playlist-plus" size="18" />
      <span class="add-panel__label">Добавить все показатели</span>
      <span class="add-panel__count">{{ addableStats.length }}</span>
    </button>

    <div v-if="availableStats.length" class="add-panel__group">
      <button
        v-for="stat in availableStats"
        :key="stat.key"
        type="button"
        class="add-panel__item"
        :disabled="!stat.hasData"
        @click="emit('addStat', stat.key)"
      >
        <v-icon icon="mdi-plus" size="18" />
        <span class="add-panel__text">
          <span class="add-panel__label">{{ stat.label }}</span>
          <span class="add-panel__value">{{ stat.hasData ? stat.value : 'Нет данных в GPX' }}</span>
        </span>
      </button>
    </div>

    <p
      v-if="!hasElements && !availableStats.length && !availableWidgets.length"
      class="add-panel__empty"
    >
      Всё уже на карточке.
    </p>
  </div>
</template>

<style scoped>
.add-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Сверху кнопки, а не плитки: тот же отступ от «ручки», что у ряда плиток (8px). */
  padding-top: 8px;
}

.add-panel__group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.add-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  color: inherit;
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-hover-bg);
  cursor: pointer;
}

.add-panel__item--all {
  justify-content: center;
  color: var(--app-primary);
  border-color: color-mix(in srgb, var(--app-primary) 45%, transparent);
  background: var(--app-primary-bg);
}

.add-panel__count {
  min-width: 20px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 18%, transparent);
}

.add-panel__item:disabled {
  cursor: default;
  opacity: 0.4;
}

.add-panel__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.add-panel__label {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.add-panel__value {
  font-size: 11px;
  opacity: 0.6;
}

.add-panel__empty {
  margin: 0;
  font-size: 13px;
  opacity: 0.6;
}
</style>
