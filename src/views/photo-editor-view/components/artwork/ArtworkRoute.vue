<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import { projectRoute, toSvgPolylinePoints } from '@/entities/activity/lib/route-projection';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';

const VIEWPORT = { width: 600, height: 300, padding: 30 };
/** Доля маршрута, у которой показывается кнопка выбора цвета. */
const EDITOR_ANCHOR_PROGRESS = 0.65;

const props = defineProps<{
  track: ITrackPoint[];
  color: string;
}>();

const emit = defineEmits<{
  changeColor: [color: string];
}>();

const points = computed(() => projectRoute(props.track, VIEWPORT));
const polylinePoints = computed(() => toSvgPolylinePoints(points.value));
const start = computed(() => points.value[0] ?? null);

const editorStyle = computed<CSSProperties | null>(() => {
  const list = points.value;
  if (list.length < 2) return null;

  const anchor = list[Math.min(list.length - 1, Math.floor(list.length * EDITOR_ANCHOR_PROGRESS))];
  if (!anchor) return null;

  return {
    left: `${(anchor.x / VIEWPORT.width) * 100}%`,
    top: `${(anchor.y / VIEWPORT.height) * 100}%`,
  };
});
</script>

<template>
  <div class="artwork-route">
    <svg
      :viewBox="`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`"
      role="img"
      aria-label="Маршрут тренировки"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        v-if="polylinePoints"
        :points="polylinePoints"
        fill="none"
        :stroke="color"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle v-if="start" :cx="start.x" :cy="start.y" r="7" :fill="color" />
    </svg>

    <div v-if="editorStyle" class="artwork-route__editor export-hidden" :style="editorStyle">
      <ColorPickerButton
        label="Цвет маршрута"
        :color="color"
        @change="emit('changeColor', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.artwork-route {
  position: relative;
  z-index: 1;
  margin: 20px -8px 12px;
}

.artwork-route svg {
  display: block;
  width: 100%;
  height: auto;
}

.artwork-route__editor {
  position: absolute;
  z-index: 5;
  transform: translate(20%, -40%);
}
</style>
