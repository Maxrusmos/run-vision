<script setup lang="ts">
import type {
  ShareBackgroundImageFit,
  ShareColorPreset,
} from '@/entities/activity/model/activity-share/activity-share.types';

defineProps<{
  preset: ShareColorPreset;
  active: boolean;
  transparent: boolean;
  backgroundImage: string | null;
  backgroundImageFit: ShareBackgroundImageFit;
  backgroundImagePosition: string;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <button
    type="button"
    class="preset"
    :class="{ 'preset--active': active }"
    :aria-pressed="active"
    @click="emit('select')"
  >
    <span
      class="preset__preview"
      :class="{ checkerboard: transparent && !backgroundImage }"
      :style="{
        backgroundColor: backgroundImage || transparent ? undefined : preset.background,
      }"
    >
      <img
        v-if="backgroundImage"
        class="preset__background-image"
        :src="backgroundImage"
        :style="{ objectFit: backgroundImageFit, objectPosition: backgroundImagePosition }"
        alt=""
        aria-hidden="true"
      />
      <span class="preset__line" :style="{ backgroundColor: preset.route }" />
      <span class="preset__dot" :style="{ backgroundColor: preset.text }" />
    </span>

    <span class="preset__name">{{ preset.name }}</span>

    <v-icon v-if="active" class="preset__check" icon="mdi-check-circle" size="small" />
  </button>
</template>

<style scoped>
.preset {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 8px;
  color: inherit;
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

.preset:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
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
</style>
