<script setup lang="ts">
import type {
  ShareCardSettings,
  ShareColorPreset,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  settings: ShareCardSettings;
  presets: ShareColorPreset[];
  activePreset: string | null;
}>();

const emit = defineEmits<{
  applyPreset: [id: string];
  setColor: [key: 'backgroundColor' | 'routeColor' | 'textColor', value: string];
}>();
</script>

<template>
  <v-card variant="outlined" class="settings-card">
    <v-card-title class="text-subtitle-1 font-weight-bold">
      <v-icon start icon="mdi-palette-outline" />
      Оформление
    </v-card-title>

    <v-card-text>
      <div class="text-body-2 text-medium-emphasis mb-3">Готовые палитры</div>

      <div class="preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="preset"
          :class="{ 'preset--active': activePreset === preset.id }"
          :aria-pressed="activePreset === preset.id"
          @click="emit('applyPreset', preset.id)"
        >
          <span
            class="preset__preview"
            :class="{ checkerboard: settings.transparentBackground }"
            :style="{
              backgroundColor: settings.transparentBackground ? undefined : preset.background,
            }"
          >
            <span class="preset__line" :style="{ backgroundColor: preset.route }" />
            <span class="preset__dot" :style="{ backgroundColor: preset.text }" />
          </span>
          <span class="preset__name">{{ preset.name }}</span>
          <v-icon
            v-if="activePreset === preset.id"
            class="preset__check"
            icon="mdi-check-circle"
            size="small"
          />
        </button>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.settings-card {
  border-radius: 16px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preset {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 8px;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.preset:hover {
  background: var(--app-hover-bg);
}

.preset--active {
  border: 2px solid var(--app-primary);
  padding: 7px;
}

.preset__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 66px;
  border-radius: 7px;
  overflow: hidden;
}

.preset__line {
  width: 54%;
  height: 4px;
  border-radius: 4px;
  transform: rotate(-20deg);
}

.preset__dot {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.preset__name {
  font-size: 12px;
  font-weight: 500;
}

.preset__check {
  position: absolute;
  top: 5px;
  right: 5px;
  color: var(--app-primary);
}

.checkerboard {
  background-color: #262626 !important;
  background-image:
    linear-gradient(45deg, #404040 25%, transparent 25%),
    linear-gradient(-45deg, #404040 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #404040 75%),
    linear-gradient(-45deg, transparent 75%, #404040 75%) !important;
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}
</style>
