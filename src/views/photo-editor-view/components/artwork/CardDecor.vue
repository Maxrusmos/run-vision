<script setup lang="ts">
import { computed } from 'vue';
import type { ShareBackgroundDecor } from '@/entities/activity/model/activity-share/activity-share.types';
import { getDecorStyle } from '@/entities/activity/model/activity-share/activity-share-decor';

/**
 * Фон Pro-оформления (градиент + узор) — на карточке и в плитках меню «Оформление».
 * Только CSS-градиенты и data-URI SVG: переносятся в PNG и кадры видео.
 */
const props = withDefaults(defineProps<{ decor: ShareBackgroundDecor; scale?: number }>(), {
  scale: 1,
});

const style = computed(() => getDecorStyle(props.decor, props.scale));
</script>

<template>
  <div class="card-decor" :style="style" aria-hidden="true" />
</template>

<style scoped>
.card-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* Скругление своё: при переносе к корзине карточка не обрезает слои фона. */
  border-radius: inherit;
  pointer-events: none;
}
</style>
