<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { CSSProperties } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareRouteOffset,
  ShareRouteSize,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ROUTE_SIZE_OPTIONS,
  ROUTE_SIZE_SCALE,
  ROUTE_VIEWPORT,
  clampRouteOffset,
} from '@/entities/activity/model/activity-share/activity-share-route';
import {
  getRouteBounds,
  projectRoute,
  toSvgPolylinePoints,
  type RoutePoint,
} from '@/entities/activity/lib/route-projection';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';

const { width: WIDTH, height: HEIGHT } = ROUTE_VIEWPORT;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const STROKE_WIDTH = 5;
const START_RADIUS = 7;
/** Толщина невидимой линии, по которой удобно попасть пальцем. */
const HIT_STROKE_WIDTH = 40;
/** Отступ рамки выделения от трека. */
const FRAME_PADDING = 10;
/** Доля маршрута, у которой стоит пипетка цвета трека. */
const COLOR_ANCHOR_PROGRESS = 0.65;

const props = defineProps<{
  track: ITrackPoint[];
  color: string;
  size: ShareRouteSize;
  offset: ShareRouteOffset;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
  changeColor: [color: string];
  setSize: [size: ShareRouteSize];
  setOffset: [offset: ShareRouteOffset];
  remove: [];
}>();

const area = useTemplateRef<HTMLElement>('area');

const points = computed(() => projectRoute(props.track, ROUTE_VIEWPORT));
const polylinePoints = computed(() => toSvgPolylinePoints(points.value));
const bounds = computed(() => getRouteBounds(points.value));
const scale = computed(() => ROUTE_SIZE_SCALE[props.size]);

// Смещение ограничиваем при рендере: после увеличения размера трек не выйдет за область.
const offset = computed(() =>
  bounds.value ? clampRouteOffset(props.offset, bounds.value, scale.value) : { x: 0, y: 0 },
);

const transform = computed(
  () =>
    `translate(${CENTER_X + offset.value.x} ${CENTER_Y + offset.value.y}) ` +
    `scale(${scale.value}) translate(${-CENTER_X} ${-CENTER_Y})`,
);

function toRendered(point: RoutePoint): RoutePoint {
  return {
    x: CENTER_X + (point.x - CENTER_X) * scale.value + offset.value.x,
    y: CENTER_Y + (point.y - CENTER_Y) * scale.value + offset.value.y,
  };
}

function toPercent(x: number, y: number): CSSProperties {
  return { left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` };
}

const start = computed(() => points.value[0] ?? null);

const frameStyle = computed<CSSProperties | null>(() => {
  if (!bounds.value) return null;

  const topLeft = toRendered({ x: bounds.value.minX, y: bounds.value.minY });
  const bottomRight = toRendered({ x: bounds.value.maxX, y: bounds.value.maxY });
  const left = Math.max(0, topLeft.x - FRAME_PADDING);
  const top = Math.max(0, topLeft.y - FRAME_PADDING);
  const right = Math.min(WIDTH, bottomRight.x + FRAME_PADDING);
  const bottom = Math.min(HEIGHT, bottomRight.y + FRAME_PADDING);

  return {
    ...toPercent(left, top),
    width: `${((right - left) / WIDTH) * 100}%`,
    height: `${((bottom - top) / HEIGHT) * 100}%`,
  };
});

const colorPickerStyle = computed<CSSProperties | null>(() => {
  const list = points.value;
  const anchor = list[Math.min(list.length - 1, Math.floor(list.length * COLOR_ANCHOR_PROGRESS))];
  if (list.length < 2 || !anchor) return null;

  const { x, y } = toRendered(anchor);
  return toPercent(x, y);
});

let dragStartOffset: ShareRouteOffset = { x: 0, y: 0 };

const { handlePointerDown } = usePointerDrag({
  // Двигаем только выделенный трек — иначе свайп по карточке мешал бы прокрутке.
  onStart: () => {
    if (!props.selected) return false;
    dragStartOffset = offset.value;
  },
  onMove: (dx, dy) => {
    const element = area.value;
    if (!element || !bounds.value) return;

    const unitsPerPixel = WIDTH / element.clientWidth;
    emit(
      'setOffset',
      clampRouteOffset(
        { x: dragStartOffset.x + dx * unitsPerPixel, y: dragStartOffset.y + dy * unitsPerPixel },
        bounds.value,
        scale.value,
      ),
    );
  },
});
</script>

<template>
  <div
    ref="area"
    class="artwork-route"
    :class="{ 'artwork-route--selected': selected }"
    :data-selectable="selected ? '' : undefined"
    @pointerdown="handlePointerDown"
  >
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      aria-label="Маршрут тренировки"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g v-if="polylinePoints" :transform="transform">
        <polyline
          :points="polylinePoints"
          fill="none"
          :stroke="color"
          :stroke-width="STROKE_WIDTH / scale"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle v-if="start" :cx="start.x" :cy="start.y" :r="START_RADIUS / scale" :fill="color" />
        <polyline
          class="artwork-route__hit export-hidden"
          :points="polylinePoints"
          fill="none"
          stroke="transparent"
          :stroke-width="HIT_STROKE_WIDTH / scale"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-selectable
          @click="emit('select')"
        />
      </g>
    </svg>

    <div v-if="selected && frameStyle" class="artwork-route__frame" :style="frameStyle">
      <SelectionFrame />

      <ArtworkElementToolbar
        class="artwork-route__toolbar export-hidden"
        :model-value="size"
        :options="ROUTE_SIZE_OPTIONS"
        options-label="Размер трека"
        remove-label="Удалить трек"
        @update:model-value="emit('setSize', $event)"
        @remove="emit('remove')"
      />
    </div>

    <div
      v-if="colorPickerStyle"
      class="artwork-route__color export-hidden"
      :style="colorPickerStyle"
      data-selectable
      @pointerdown.stop
      @click.stop
    >
      <ColorPickerButton label="Цвет трека" :color="color" @change="emit('changeColor', $event)" />
    </div>
  </div>
</template>

<style scoped>
.artwork-route {
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.artwork-route svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.artwork-route__hit {
  cursor: pointer;
  pointer-events: stroke;
}

/* Выделенный трек перетаскивается по всей области, без прокрутки страницы. */
.artwork-route--selected {
  cursor: grab;
  touch-action: none;
}

.artwork-route--selected:active {
  cursor: grabbing;
}

.artwork-route__frame {
  position: absolute;
  border-radius: 14px;
  pointer-events: none;
}

.artwork-route__toolbar {
  position: absolute;
  z-index: 3;
  top: -13px;
  right: -6px;
  pointer-events: auto;
}

.artwork-route__color {
  position: absolute;
  z-index: 5;
  transform: translate(20%, -40%);
}
</style>
