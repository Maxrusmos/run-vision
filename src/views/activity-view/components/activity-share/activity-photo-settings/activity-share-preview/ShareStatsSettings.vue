<script setup lang="ts">
import type {
  ShareStatKey,
  ShareStatOption,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  visibleStats: ShareStatKey[];
  options: ShareStatOption[];
}>();

const emit = defineEmits<{
  add: [key: ShareStatKey];
  remove: [key: ShareStatKey];
  move: [key: ShareStatKey, direction: -1 | 1];
}>();
</script>

<template>
  <v-card variant="outlined" class="settings-card">
    <v-card-title class="text-subtitle-1 font-weight-bold">
      <v-icon start icon="mdi-chart-box-outline" />
      Статистика
    </v-card-title>

    <v-card-subtitle> Выбери показатели и настрой их порядок на карточке. </v-card-subtitle>

    <v-card-text>
      <div class="stats-list">
        <div v-for="(key, index) in visibleStats" :key="key" class="stat-row">
          <v-icon icon="mdi-drag" color="medium-emphasis" size="small" />

          <div class="stat-row__text">
            <div class="text-body-2 font-weight-medium">
              {{ options.find((item) => item.key === key)?.label ?? key }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ options.find((item) => item.key === key)?.shortLabel ?? '' }}
            </div>
          </div>

          <div class="stat-row__actions">
            <v-btn
              icon="mdi-chevron-up"
              size="x-small"
              variant="text"
              :disabled="index === 0"
              aria-label="Переместить выше"
              @click="emit('move', key, -1)"
            />
            <v-btn
              icon="mdi-chevron-down"
              size="x-small"
              variant="text"
              :disabled="index === visibleStats.length - 1"
              aria-label="Переместить ниже"
              @click="emit('move', key, 1)"
            />
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              color="error"
              aria-label="Убрать показатель"
              @click="emit('remove', key)"
            />
          </div>
        </div>

        <div v-if="visibleStats.length === 0" class="empty-stats text-body-2 text-medium-emphasis">
          Выбери хотя бы один показатель ниже.
        </div>
      </div>

      <v-divider class="my-4" />

      <div class="text-body-2 font-weight-medium mb-3">Добавить показатель</div>

      <div class="available-stats">
        <v-chip
          v-for="option in options.filter((item) => !visibleStats.includes(item.key))"
          :key="option.key"
          prepend-icon="mdi-plus"
          variant="outlined"
          size="small"
          class="available-stat"
          @click="emit('add', option.key)"
        >
          {{ option.label }}
        </v-chip>

        <span
          v-if="options.every((item) => visibleStats.includes(item.key))"
          class="text-caption text-medium-emphasis"
        >
          Все показатели уже добавлены.
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.settings-card {
  border-radius: 16px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--app-hover-bg);
}

.stat-row__text {
  flex: 1;
  min-width: 0;
}

.stat-row__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.empty-stats {
  padding: 14px 8px;
  text-align: center;
}

.available-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.available-stat {
  cursor: pointer;
}
</style>
