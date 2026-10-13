<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types.ts';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setTransparentBackground: [value: boolean];
}>();
</script>

<template>
  <v-card variant="outlined" class="settings-card">
    <v-card-title class="text-subtitle-1 font-weight-bold">
      <v-icon start icon="mdi-layers-outline" />
      Фон карточки
    </v-card-title>

    <v-card-text>
      <button
        type="button"
        class="background-option"
        :class="{ 'background-option--active': settings.transparentBackground }"
        :aria-pressed="settings.transparentBackground"
        @click="emit('setTransparentBackground', !settings.transparentBackground)"
      >
        <span
          class="background-option__preview"
          :class="{ checkerboard: settings.transparentBackground }"
          :style="{
            backgroundColor: settings.transparentBackground ? undefined : settings.backgroundColor,
          }"
        >
          <span class="background-option__content">
            <v-icon
              icon="mdi-image-outline"
              size="24"
              :color="settings.transparentBackground ? 'grey-darken-2' : settings.textColor"
            />
          </span>
        </span>

        <span class="background-option__details">
          <span class="background-option__title">Прозрачный фон</span>
          <span class="background-option__description">
            Без заливки, с сохранением прозрачности в PNG
          </span>
        </span>

        <v-checkbox-btn
          :model-value="settings.transparentBackground"
          color="primary"
          :ripple="false"
          tabindex="-1"
          aria-hidden="true"
        />
      </button>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.settings-card {
  border-radius: 16px;
}

.background-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.background-option:hover {
  background: var(--app-hover-bg);
}

.background-option--active {
  border-color: var(--app-primary);
}

.background-option__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}

.background-option__content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 6px;
  background: rgb(255 255 255 / 65%);
}

.background-option__details {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.background-option__title {
  font-size: 13px;
  font-weight: 600;
}

.background-option__description {
  color: rgb(var(--app-on-surface));
  opacity: 0.65;
  font-size: 11px;
  line-height: 1.4;
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
