<script setup lang="ts">
import type { ShareBackgroundImageFit } from '@/entities/activity/model/activity-share/activity-share.types';

defineProps<{
  transparent: boolean;
  image: string | null;
  imageFit: ShareBackgroundImageFit;
  imagePosition: string;
}>();
</script>

<template>
  <div
    v-if="transparent"
    class="artwork-background__layer checkerboard export-hidden"
    aria-hidden="true"
  />

  <img
    v-if="image"
    class="artwork-background__layer artwork-background__image"
    :src="image"
    :style="{ objectFit: imageFit, objectPosition: imagePosition }"
    alt=""
    aria-hidden="true"
  />
</template>

<style scoped>
.artwork-background__layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.artwork-background__image {
  width: 100%;
  height: 100%;
}
</style>
