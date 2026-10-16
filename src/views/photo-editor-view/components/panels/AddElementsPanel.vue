<script setup lang="ts">
import { computed } from 'vue';
import type {
  ShareCardSettings,
  ShareStatKey,
} from '@/entities/activity/model/activity-share/activity-share.types';
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
  addElevation: [];
}>();

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

    <p v-if="!hasElements && !availableStats.length" class="add-panel__empty">
      Всё уже на карточке.
    </p>
  </div>
</template>

<style scoped>
.add-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
