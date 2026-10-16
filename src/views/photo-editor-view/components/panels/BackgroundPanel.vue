<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setBackgroundColor: [color: string];
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
}>();

function handleColorInput(event: Event) {
  emit('setBackgroundColor', (event.target as HTMLInputElement).value);
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (file?.type.startsWith('image/')) {
    emit('setBackgroundImage', file);
  }
}

function toggleTransparent() {
  emit('setTransparentBackground', !props.settings.transparentBackground);
}
</script>

<template>
  <div class="background-panel">
    <!-- Цвет: тап открывает системную палитру. Под фото цвет не виден. -->
    <OptionTile
      tag="label"
      label="Цвет"
      :active="!settings.transparentBackground && !settings.backgroundImage"
      :disabled="Boolean(settings.backgroundImage)"
    >
      <template #preview>
        <span class="background-panel__swatch" :style="{ background: settings.backgroundColor }">
          <v-icon icon="mdi-eyedropper-variant" size="18" />
        </span>
      </template>
      <input
        class="visually-hidden"
        type="color"
        :value="settings.backgroundColor"
        aria-label="Цвет фона"
        @input="handleColorInput"
      />
    </OptionTile>

    <!-- Фото: тап — загрузить или заменить, крестик — удалить. -->
    <OptionTile tag="label" label="Фото" :active="Boolean(settings.backgroundImage)">
      <template #preview>
        <img
          v-if="settings.backgroundImage"
          class="background-panel__photo"
          :src="settings.backgroundImage"
          alt=""
        />
        <v-icon v-else icon="mdi-image-plus-outline" size="24" />
      </template>
      <input
        class="visually-hidden"
        type="file"
        accept="image/*"
        aria-label="Фоновое фото"
        @change="handleFileChange"
      />
      <button
        v-if="settings.backgroundImage"
        type="button"
        class="background-panel__remove"
        aria-label="Удалить фоновое фото"
        @click.prevent.stop="emit('removeBackgroundImage')"
      >
        <v-icon icon="mdi-close" size="14" />
      </button>
    </OptionTile>

    <OptionTile
      label="Прозрачный"
      :active="settings.transparentBackground"
      :disabled="Boolean(settings.backgroundImage)"
      @click="toggleTransparent"
    >
      <template #preview>
        <span class="background-panel__transparent checkerboard">
          <v-icon icon="mdi-image-outline" size="20" />
        </span>
      </template>
    </OptionTile>
  </div>
</template>

<style scoped>
.background-panel {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 10px 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.background-panel::-webkit-scrollbar {
  display: none;
}

.background-panel__swatch,
.background-panel__transparent {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #fff;
}

.background-panel__swatch :deep(.v-icon) {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 70%));
}

.background-panel__transparent {
  --checkerboard-size: 12px;
}

.background-panel__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-panel__remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  padding: 0;
  color: #fff;
  border: 0;
  border-radius: 50%;
  background: #d94848;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
  cursor: pointer;
}
</style>
