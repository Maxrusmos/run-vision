<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { CSSProperties } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareRoutePosition,
  ShareRouteSize,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ROUTE_LAYER_WIDTH,
  ROUTE_SIZE_OPTIONS,
  clampRoutePosition,
  getRouteScale,
  type RouteLayerSize,
} from '@/entities/activity/model/activity-share/activity-share-route';
import {
  getRouteBounds,
  projectRoute,
  toSvgPolylinePoints,
} from '@/entities/activity/lib/route-projection';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';

const STROKE_WIDTH = 8;
const START_RADIUS = 11;
/** Толщина невидимой линии, по которой удобно попасть пальцем. */
const HIT_STROKE_WIDTH = 56;
/** Отступ трека от краёв места под трек. */
const SLOT_PADDING = 16;
/** Отступ рамки выделения от трека. */
const FRAME_PADDING = 16;
/** Сколько места нужно над/под рамкой для панели действий. */
const TOOLBAR_SPACE = 60;

type SlotBox = { left: number; top: number; width: number; height: number };

const props = defineProps<{
  track: ITrackPoint[];
  color: string;
  size: ShareRouteSize;
  position: ShareRoutePosition | null;
  selected: boolean;
  /** Место под трек в раскладке карточки — задаёт размер M и исходное положение. */
  slotElement: HTMLElement | null;
}>();

const emit = defineEmits<{
  select: [];
  changeColor: [color: string];
  setSize: [size: ShareRouteSize];
  setPosition: [position: ShareRoutePosition];
  remove: [];
}>();

const layerElement = useTemplateRef<HTMLElement>('layer');
const layer = ref<RouteLayerSize>({ width: ROUTE_LAYER_WIDTH, height: ROUTE_LAYER_WIDTH });
const slot = ref<SlotBox | null>(null);

// Слой трека — от низа названия до низа карточки. Переводим пиксели в единицы слоя.
useResizeObserver(
  () => [layerElement.value, props.slotElement],
  () => {
    const layerRect = layerElement.value?.getBoundingClientRect();
    const slotRect = props.slotElement?.getBoundingClientRect();
    if (!layerRect?.width || !slotRect) return;

    const unitsPerPixel = ROUTE_LAYER_WIDTH / layerRect.width;
    layer.value = { width: ROUTE_LAYER_WIDTH, height: layerRect.height * unitsPerPixel };
    slot.value = {
      left: (slotRect.left - layerRect.left) * unitsPerPixel,
      top: (slotRect.top - layerRect.top) * unitsPerPixel,
      width: slotRect.width * unitsPerPixel,
      height: slotRect.height * unitsPerPixel,
    };
  },
);

// Точки трека в масштабе 1 (размер M), относительно центра трека.
const localPoints = computed(() => {
  if (!slot.value) return [];

  const { width, height } = slot.value;
  return projectRoute(props.track, { width, height, padding: SLOT_PADDING }).map((point) => ({
    x: point.x - width / 2,
    y: point.y - height / 2,
  }));
});

const polylinePoints = computed(() => toSvgPolylinePoints(localPoints.value));
const bounds = computed(() => getRouteBounds(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);

const scale = computed(() =>
  bounds.value ? getRouteScale(props.size, bounds.value, layer.value) : 1,
);

const defaultPosition = computed<ShareRoutePosition>(() =>
  slot.value
    ? { x: slot.value.left + slot.value.width / 2, y: slot.value.top + slot.value.height / 2 }
    : { x: layer.value.width / 2, y: layer.value.height / 2 },
);

// Ограничиваем при рендере: после увеличения размера трек не выйдет за слой.
const center = computed(() => {
  const position = props.position ?? defaultPosition.value;
  return bounds.value
    ? clampRoutePosition(position, bounds.value, scale.value, layer.value)
    : position;
});

const transform = computed(
  () => `translate(${center.value.x} ${center.value.y}) scale(${scale.value})`,
);

const frame = computed(() => {
  if (!bounds.value) return null;

  const { width, height } = layer.value;
  const left = Math.max(0, center.value.x + bounds.value.minX * scale.value - FRAME_PADDING);
  const top = Math.max(0, center.value.y + bounds.value.minY * scale.value - FRAME_PADDING);
  const right = Math.min(width, center.value.x + bounds.value.maxX * scale.value + FRAME_PADDING);
  const bottom = Math.min(height, center.value.y + bounds.value.maxY * scale.value + FRAME_PADDING);

  return { left, top, right, bottom };
});

const frameStyle = computed<CSSProperties | null>(() => {
  if (!frame.value) return null;

  const { width, height } = layer.value;
  const { left, top, right, bottom } = frame.value;

  return {
    left: `${(left / width) * 100}%`,
    top: `${(top / height) * 100}%`,
    width: `${((right - left) / width) * 100}%`,
    height: `${((bottom - top) / height) * 100}%`,
  };
});

// Панель над рамкой, а если трек прижат к названию — под рамкой, чтобы не перекрывать его.
const toolbarPlacement = computed<'top' | 'bottom' | 'inside'>(() => {
  if (!frame.value || frame.value.top >= TOOLBAR_SPACE) return 'top';
  return frame.value.bottom <= layer.value.height - TOOLBAR_SPACE ? 'bottom' : 'inside';
});

let dragStart: ShareRoutePosition = { x: 0, y: 0 };

const { handlePointerDown } = usePointerDrag({
  onStart: () => {
    dragStart = center.value;
  },
  onMove: (dx, dy) => {
    const element = layerElement.value;
    if (!element || !bounds.value) return;

    const unitsPerPixel = ROUTE_LAYER_WIDTH / element.clientWidth;
    emit(
      'setPosition',
      clampRoutePosition(
        { x: dragStart.x + dx * unitsPerPixel, y: dragStart.y + dy * unitsPerPixel },
        bounds.value,
        scale.value,
        layer.value,
      ),
    );
  },
});
</script>

<template>
  <div ref="layer" class="route-layer" :class="{ 'route-layer--selected': selected }">
    <svg
      class="route-layer__svg"
      :viewBox="`0 0 ${layer.width} ${layer.height}`"
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
      </g>
    </svg>

    <!-- Зона касания лежит под показателями: тап по показателю не выделяет трек. -->
    <svg
      v-if="polylinePoints && !selected"
      class="route-layer__hit-svg export-hidden"
      :viewBox="`0 0 ${layer.width} ${layer.height}`"
      aria-hidden="true"
    >
      <polyline
        class="route-layer__hit"
        :transform="transform"
        :points="polylinePoints"
        fill="none"
        stroke="transparent"
        :stroke-width="HIT_STROKE_WIDTH / scale"
        stroke-linecap="round"
        stroke-linejoin="round"
        data-selectable
        @click="emit('select')"
      />
    </svg>

    <!-- Выделенный трек перетаскивается за всю рамку, без прокрутки страницы. -->
    <div
      v-if="selected && frameStyle"
      class="route-layer__frame"
      :style="frameStyle"
      data-selectable
      @pointerdown="handlePointerDown"
    >
      <SelectionFrame />

      <ArtworkElementToolbar
        class="route-layer__toolbar export-hidden"
        :class="`route-layer__toolbar--${toolbarPlacement}`"
        :model-value="size"
        :options="ROUTE_SIZE_OPTIONS"
        options-label="Размер трека"
        remove-label="Удалить трек"
        @update:model-value="emit('setSize', $event!)"
        @remove="emit('remove')"
      >
        <ColorPickerButton
          label="Цвет трека"
          :color="color"
          @change="emit('changeColor', $event)"
        />
      </ArtworkElementToolbar>
    </div>
  </div>
</template>

<style scoped>
.route-layer {
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
}

/*
 * Слой без своего z-index, поэтому его части встают в общий порядок карточки:
 * линия трека (2) — над показателями (1), зона касания (0) — под ними,
 * рамка выделенного трека (5) — над всем, включая название (4).
 */
.route-layer__svg,
.route-layer__hit-svg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.route-layer__svg {
  z-index: 2;
}

.route-layer__hit-svg {
  z-index: 0;
}

.route-layer__hit {
  cursor: pointer;
  pointer-events: stroke;
}

.route-layer__frame {
  position: absolute;
  z-index: 5;
  border-radius: 16px;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
}

.route-layer__frame:active {
  cursor: grabbing;
}

.route-layer__toolbar {
  position: absolute;
  z-index: 3;
  right: -6px;
}

.route-layer__toolbar--top {
  top: -14px;
}

.route-layer__toolbar--bottom {
  bottom: -14px;
}

.route-layer__toolbar--inside {
  top: 8px;
  right: 8px;
}
</style>
