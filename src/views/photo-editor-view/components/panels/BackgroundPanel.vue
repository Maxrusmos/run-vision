<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type {
  ShareBackgroundPattern,
  ShareCardSettings,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_BACKGROUND_PATTERNS } from '@/entities/activity/model/activity-share/activity-share-widgets';
import BackgroundPattern from '@/views/photo-editor-view/components/artwork/BackgroundPattern.vue';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import ColorResetDialog from '@/views/photo-editor-view/components/ColorResetDialog.vue';
import {
  getProDesignInUse,
  isDecorVisible,
} from '@/entities/activity/model/activity-share/activity-share-pro';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setBackgroundColor: [color: string];
  setTransparentBackground: [value: boolean];
  setBackgroundImage: [file: File];
  removeBackgroundImage: [];
  setPattern: [pattern: ShareBackgroundPattern];
}>();

// Pro-оформление: фон — градиент с узором; свой цвет фона его уберёт — сначала предупредить.
const colorTile = useTemplateRef<{ openPicker: () => void }>('colorTile');
const isColorResetOpen = ref(false);
const hasDecor = computed(() => isDecorVisible(props.settings));
const colorResetText = computed(() => {
  const name = getProDesignInUse(props.settings)?.name;
  return `${name ? `Фон оформления «${name}»` : 'Этот фон'} — градиент с узором. Свой цвет фона заменит его сплошным цветом.`;
});

function confirmColorReset() {
  isColorResetOpen.value = false;
  // Узор убираем сразу (тем же цветом): иначе, если палитру закрыли, тап снова звал бы диалог.
  emit('setBackgroundColor', props.settings.backgroundColor);
  colorTile.value?.openPicker();
}

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
    <!-- Цвет закреплён слева, как в других меню; прокручиваются фото, прозрачный и узоры.
         Под фото цвет фона не виден, поэтому плитка неактивна. -->
    <template #fixed>
      <ColorOptionTile
        ref="colorTile"
        :guarded="hasDecor"
        @guarded="isColorResetOpen = true"
        label="Цвет"
        input-label="Цвет фона"
        :color="settings.backgroundColor"
        :active="!settings.transparentBackground && !settings.backgroundImage"
        :disabled="Boolean(settings.backgroundImage)"
        @change="emit('setBackgroundColor', $event)"
      />
    </template>

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

    <!-- Узоры-разметка, как на приборной панели (поверх цвета и фото), — во всех шаблонах. -->
    <OptionTile
      v-for="pattern in SHARE_BACKGROUND_PATTERNS"
      :key="pattern.id"
      :label="pattern.name"
      :active="settings.backgroundPattern === pattern.id"
      @click="emit('setPattern', pattern.id)"
    >
      <template #preview>
        <span class="background-panel__pattern" :style="{ background: settings.backgroundColor }">
          <BackgroundPattern :pattern="pattern.id" :color="settings.textColor" :unit="14" />
          <v-icon
            v-if="pattern.id === 'none'"
            icon="mdi-cancel"
            size="18"
            :color="settings.textColor"
            class="background-panel__none"
          />
        </span>
      </template>
    </OptionTile>
  </OptionTileRow>

  <ColorResetDialog
    v-model="isColorResetOpen"
    title="Фон задаёт оформление"
    :text="colorResetText"
    @confirm="confirmColorReset"
  />
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

.background-panel__pattern {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.background-panel__none {
  opacity: 0.5;
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
