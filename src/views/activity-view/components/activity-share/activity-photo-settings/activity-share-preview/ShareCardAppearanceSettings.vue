<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types.ts';
import ShareSettingToggle from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareSettingToggle.vue';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setTransparentBackground: [value: boolean];
  setShowStatBorders: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
  setStatSpacing: [value: number];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const hasBackgroundImage = computed(() => Boolean(props.settings.backgroundImage));

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    input.value = '';
    return;
  }

  emit('setBackgroundImage', file);
  input.value = '';
}
</script>

<template>
  <v-expansion-panels variant="accordion">
    <v-expansion-panel class="settings-card">
      <v-expansion-panel-title class="settings-panel-title">
        <v-icon start icon="mdi-tune-variant" size="18" />
        <span class="font-weight-bold">Настройки карточки</span>
      </v-expansion-panel-title>

      <v-expansion-panel-text class="settings-content mt-3">
        <section class="settings-section">
          <div class="spacing-setting">
            <div class="spacing-setting__header">
              <div class="spacing-setting__title">
                <v-icon icon="mdi-arrow-collapse-vertical" size="18" />
                Плотность карточки
              </div>
            </div>

            <v-slider
              :model-value="settings.statSpacing"
              :min="4"
              :max="24"
              :step="2"
              :ticks="{
                4: 'Компактно',
                14: 'Средне',
                24: 'Свободно',
              }"
              show-ticks="always"
              tick-size="4"
              hide-details
              color="primary"
              track-size="4"
              thumb-size="16"
              aria-label="Плотность карточки"
              @update:model-value="emit('setStatSpacing', Number($event))"
            />

            <div class="spacing-setting__description">
              Управляет расстоянием между показателями статистики
            </div>
          </div>
          <ShareSettingToggle
            :model-value="settings.showStatBorders"
            title="Границы показателей"
            description="Показывать рамки вокруг статистики"
            @update:model-value="emit('setShowStatBorders', $event)"
          >
            <template #preview>
              <span class="setting-option__preview stat-border-preview">
                <v-icon icon="mdi-card-outline" size="24" />
              </span>
            </template>
          </ShareSettingToggle>
          <ShareSettingToggle
            :model-value="settings.transparentBackground"
            :disabled="hasBackgroundImage"
            title="Прозрачный фон"
            :description="
              hasBackgroundImage
                ? 'Удалите фоновое фото, чтобы включить прозрачность'
                : 'Сохранить прозрачность в PNG'
            "
            @update:model-value="emit('setTransparentBackground', $event)"
          >
            <template #preview>
              <span
                class="setting-option__preview checkerboard"
                :class="{
                  'setting-option__preview--solid': !settings.transparentBackground,
                }"
                :style="{
                  backgroundColor: settings.transparentBackground
                    ? undefined
                    : settings.backgroundColor,
                }"
              >
                <v-icon icon="mdi-image-outline" size="24" />
              </span>
            </template>
          </ShareSettingToggle>
          <input
            ref="fileInput"
            class="visually-hidden"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          />
          <div class="setting-option setting-option--upload">
            <span class="setting-option__preview setting-option__preview--photo">
              <v-icon icon="mdi-image-plus-outline" size="24" />
            </span>

            <span class="setting-option__details">
              <span class="setting-option__title">
                {{ hasBackgroundImage ? 'Фото загружено' : 'Фоновое изображение' }}
              </span>

              <span class="setting-option__description">
                {{
                  hasBackgroundImage ? 'Можно заменить или удалить фото' : 'Использовать своё фото'
                }}
              </span>
            </span>

            <div class="setting-option__actions">
              <v-btn
                v-if="hasBackgroundImage"
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                aria-label="Удалить фоновое изображение"
                @click="emit('removeBackgroundImage')"
              />

              <v-btn
                icon="mdi-upload"
                size="small"
                variant="tonal"
                aria-label="Загрузить фоновое изображение"
                @click="openFilePicker"
              />
            </div>
          </div>
        </section>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.settings-card {
  border-radius: 16px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.settings-section__title {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--app-on-surface));
  opacity: 0.7;
}

.setting-option {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 72px;
  align-items: center;
  column-gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: transparent;
}

.setting-option--upload {
  cursor: default;
}

.setting-option__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
}

.setting-option__preview--solid {
  background-image: none;
}

.setting-option__preview--photo {
  background: var(--app-hover-bg);
}

.setting-option__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.setting-option__title {
  font-size: 13px;
  font-weight: 600;
}

.setting-option__description {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--app-on-surface));
  opacity: 0.65;
}

.setting-option__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  gap: 4px;
  width: 72px;
  min-width: 72px;
}

.setting-option__actions :deep(.v-btn) {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
}

.stat-border-preview {
  color: var(--app-primary);
  background: var(--app-hover-bg);
}

.spacing-setting {
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.spacing-setting__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.spacing-setting__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.spacing-setting :deep(.v-slider) {
  margin: 8px 4px 18px;
}

.spacing-setting :deep(.v-slider-track__tick-label) {
  font-size: 10px;
  white-space: nowrap;
}

.spacing-setting__description {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--app-on-surface));
  opacity: 0.65;
}

.checkerboard {
  background-color: #262626;
  background-image: conic-gradient(#404040 25%, #262626 0 50%, #404040 0 75%, #262626 0);
  background-size: 14px 14px;
  background-repeat: repeat;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.settings-card :deep(.v-card-title) {
  font-size: 16px;
  min-height: auto;
}
.settings-card {
  overflow: hidden;
  border-radius: 16px;
}

.settings-panel-title {
  min-height: 52px;
  padding: 12px 16px;
  font-size: 14px;
}

.settings-panel-title :deep(.v-icon) {
  margin-inline-end: 8px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 16px;
}
</style>
