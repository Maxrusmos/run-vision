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
            :class="{
              checkerboard: settings.transparentBackground && !settings.backgroundImage,
            }"
            :style="{
              backgroundColor:
                settings.backgroundImage || settings.transparentBackground
                  ? undefined
                  : preset.background,
            }"
          >
            <img
              v-if="settings.backgroundImage"
              class="preset__background-image"
              :src="settings.backgroundImage"
              :style="{
                objectFit: settings.backgroundImageFit,
                objectPosition: settings.backgroundImagePosition,
              }"
              alt=""
              aria-hidden="true"
            />

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
  padding: 7px;
  border: 2px solid var(--app-primary);
}

.preset__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 66px;
  overflow: hidden;
  border-radius: 7px;
}

.preset__background-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.preset__line {
  position: relative;
  z-index: 1;
  width: 54%;
  height: 4px;
  border-radius: 4px;
  transform: rotate(-20deg);
}

.preset__dot {
  position: absolute;
  z-index: 1;
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
  background-color: #262626;
  background-image: conic-gradient(#404040 25%, #262626 0 50%, #404040 0 75%, #262626 0);
  background-size: 20px 20px;
  background-repeat: repeat;
}
</style>
