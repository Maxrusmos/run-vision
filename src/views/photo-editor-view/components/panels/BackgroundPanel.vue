<script setup lang="ts">
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setBackgroundColor: [color: string];
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
}>();

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (file?.type.startsWith('image/')) {
    emit('setBackgroundImage', file);
  }
}
</script>

<template>
  <OptionTileRow>
    <!-- Под фото цвет фона не виден, поэтому плитка неактивна. -->
    <ColorOptionTile
      label="Цвет"
      input-label="Цвет фона"
      :color="settings.backgroundColor"
      :active="!settings.transparentBackground && !settings.backgroundImage"
      :disabled="Boolean(settings.backgroundImage)"
      @change="emit('setBackgroundColor', $event)"
    />

    <!-- Фото: тап — загрузить или заменить, крестик — удалить. -->
    <OptionTile tag="label" label="Фото" :active="Boolean(settings.backgroundImage)">
      <template #preview>
        <img
          v-if="settings.backgroundImage"
          class="background-panel__photo"
          :src="settings.backgroundImage"
          alt=""
        />
        <v-icon v-else icon="mdi-image-plus-outline" size="22" />
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
      @click="emit('setTransparentBackground', !props.settings.transparentBackground)"
    >
      <template #preview>
        <span class="background-panel__transparent checkerboard">
          <v-icon icon="mdi-image-outline" size="20" />
        </span>
      </template>
    </OptionTile>
  </OptionTileRow>
</template>

<style scoped>
.background-panel__transparent {
  --checkerboard-size: 12px;

  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #fff;
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
  width: 22px;
  height: 22px;
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
