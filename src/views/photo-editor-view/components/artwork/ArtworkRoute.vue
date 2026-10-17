<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { CSSProperties } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { RoutePoint } from '@/entities/activity/lib/route-projection';
import type {
  ShareRoutePosition,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ROUTE_LAYER_WIDTH,
  clampRoutePosition,
  getRouteScale,
  type RouteLayerSize,
} from '@/entities/activity/model/activity-share/activity-share-route';
import {
  getRouteBounds,
  orientRoute,
  projectRoute,
  toSvgPolylinePoints,
} from '@/entities/activity/lib/route-projection';
import {
  MARKER_SPACING,
  getKmMarkers,
  spreadKmMarkers,
} from '@/entities/activity/model/activity-share/activity-share-map';
import { usePinchDrag } from '@/hooks/usePinchDrag';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';
import RouteMarkers from '@/views/photo-editor-view/components/artwork/RouteMarkers.vue';

/** Толщина невидимой линии, по которой удобно попасть пальцем. */
const HIT_STROKE_WIDTH = 56;
/** Отступ трека от краёв места под трек. */
const SLOT_PADDING = 16;
/** Отступ рамки выделения от трека. */
const FRAME_PADDING = 16;
/** Чувствительность масштабирования колёсиком мыши. */
const WHEEL_ZOOM_SPEED = 0.0015;
/** Сколько места нужно над/под рамкой для панели действий. */
const TOOLBAR_SPACE = 60;

type SlotBox = { left: number; top: number; width: number; height: number };

const props = defineProps<{
  track: ITrackPoint[];
  color: string;
  textColor: string;
  backgroundColor: string;
  routeStyle: ShareRouteStyle;
  scale: number;
  position: ShareRoutePosition | null;
  /** Поворот и наклон трека, градусы. */
  bearing: number;
  pitch: number;
  /** Флажки: отметки километров и старт/финиш. */
  kmMarkers: boolean;
  startFinish: boolean;
  selected: boolean;
  /** Место под трек в раскладке карточки — задаёт размер M и исходное положение. */
  slotElement: HTMLElement | null;
}>();

const emit = defineEmits<{
  select: [];
  setScale: [scale: number];
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
const flatPoints = computed(() => {
  if (!slot.value) return [];

  const { width, height } = slot.value;
  return projectRoute(props.track, { width, height, padding: SLOT_PADDING }).map((point) => ({
    x: point.x - width / 2,
    y: point.y - height / 2,
  }));
});

// Повёрнутый и наклонённый трек снова вписан в место под трек.
const localPoints = computed(() =>
  slot.value
    ? orientRoute(
        flatPoints.value,
        { bearing: props.bearing, pitch: props.pitch },
        { width: slot.value.width, height: slot.value.height, padding: SLOT_PADDING },
      )
    : [],
);

const polylinePoints = computed(() => toSvgPolylinePoints(localPoints.value));
const bounds = computed(() => getRouteBounds(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);

const scale = computed(() =>
  bounds.value ? getRouteScale(props.scale, bounds.value, layer.value) : props.scale,
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

const kmMarkerList = computed(() => (props.kmMarkers ? getKmMarkers(props.track) : []));

/** Точка на слое (без масштаба линии): флажки одного размера при любом масштабе трека. */
const toLayer = (point: RoutePoint): RoutePoint => ({
  x: center.value.x + point.x * scale.value,
  y: center.value.y + point.y * scale.value,
});

const startPoint = computed(() => (start.value ? toLayer(start.value) : null));
const finishPoint = computed(() => {
  const last = localPoints.value[localPoints.value.length - 1];
  return last ? toLayer(last) : null;
});

// Флажок — между двумя точками уже повёрнутого трека: отрезки GPX короткие.
const kmPoints = computed(() => {
  const points = localPoints.value;
  const placed = kmMarkerList.value.flatMap(({ km, index, t }) => {
    const a = points[index];
    const b = points[index + 1] ?? a;
    if (!a || !b) return [];
    return [{ ...toLayer({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }), km }];
  });
  const occupied =
    props.startFinish && startPoint.value && finishPoint.value
      ? [startPoint.value, finishPoint.value]
      : [];
  return spreadKmMarkers(placed, occupied, MARKER_SPACING);
});

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

// По экранной ширине (getBoundingClientRect), а не clientWidth: карточка может быть уменьшена.
const unitsPerPixel = () =>
  ROUTE_LAYER_WIDTH / (layerElement.value?.getBoundingClientRect().width || 1);

/** Ставит трек с новым масштабом и центром, не выпуская его за пределы слоя. */
function applyTransform(nextScale: number, nextCenter: ShareRoutePosition) {
  if (!bounds.value) return;

  const fitted = getRouteScale(nextScale, bounds.value, layer.value);
  emit('setScale', fitted);
  emit('setPosition', clampRoutePosition(nextCenter, bounds.value, fitted, layer.value));
}

// Один палец (или мышь) двигает трек, два пальца — масштабируют щипком и двигают.
let gestureStart = { scale: 1, center: { x: 0, y: 0 } };

const { handlePointerDown } = usePinchDrag({
  onStart: () => {
    gestureStart = { scale: scale.value, center: center.value };
  },
  onChange: ({ dx, dy, scale: pinch }) => {
    const units = unitsPerPixel();
    applyTransform(gestureStart.scale * pinch, {
      x: gestureStart.center.x + dx * units,
      y: gestureStart.center.y + dy * units,
    });
  },
});

// Десктоп: уголок рамки масштабирует трек относительно его центра.
let resizeStart = { scale: 1, distance: 1, centerX: 0, centerY: 0 };

const { handlePointerDown: handleResizePointerDown } = usePointerDrag({
  onStart: (event) => {
    const rect = layerElement.value?.getBoundingClientRect();
    if (!rect) return false;

    const centerX = rect.left + center.value.x / unitsPerPixel();
    const centerY = rect.top + center.value.y / unitsPerPixel();
    resizeStart = {
      scale: scale.value,
      distance: Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
      centerX,
      centerY,
    };
  },
  onMove: (_dx, _dy, event) => {
    const distance = Math.hypot(
      event.clientX - resizeStart.centerX,
      event.clientY - resizeStart.centerY,
    );
    applyTransform((resizeStart.scale * distance) / resizeStart.distance, center.value);
  },
});

// Десктоп: колёсико мыши над выделенным треком.
function handleWheel(event: WheelEvent) {
  applyTransform(scale.value * Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), center.value);
}
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
        <RouteStyleLayers
          :points="polylinePoints"
          :start="start"
          :style-id="routeStyle"
          :route-color="color"
          :text-color="textColor"
          :background-color="backgroundColor"
          :unit="1 / scale"
        />
      </g>
      <RouteMarkers
        v-if="polylinePoints && (kmMarkers || startFinish)"
        :km-points="kmPoints"
        :start="startPoint"
        :finish="finishPoint"
        :start-finish="startFinish"
        :text-color="textColor"
        :background-color="backgroundColor"
        :unit="1"
      />
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
      @wheel.prevent="handleWheel"
    >
      <SelectionFrame />

      <!-- Уголок для изменения размера мышью; на телефоне — щипок двумя пальцами. -->
      <span
        class="route-layer__resize export-hidden"
        :class="{ 'route-layer__resize--top': toolbarPlacement === 'bottom' }"
        aria-hidden="true"
        @pointerdown.stop="handleResizePointerDown"
      />

      <ArtworkElementToolbar
        class="route-layer__toolbar export-hidden"
        :class="`route-layer__toolbar--${toolbarPlacement}`"
        remove-label="Удалить трек"
        @remove="emit('remove')"
      />
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

.route-layer__resize {
  position: absolute;
  z-index: 3;
  right: -7px;
  bottom: -7px;
  display: none;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #475569;
  box-shadow: 0 1px 4px rgb(0 0 0 / 35%);
  cursor: nwse-resize;
}

.route-layer__resize--top {
  top: -7px;
  bottom: auto;
  cursor: nesw-resize;
}

/* Уголок нужен только с мышью; на сенсорных экранах размер меняется щипком. */
@media (hover: hover) and (pointer: fine) {
  .route-layer__resize {
    display: block;
  }
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
