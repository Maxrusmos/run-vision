<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { maplibregl } from '@/shared/lib/map/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { RoutePoint } from '@/entities/activity/lib/route-projection';
import { toSvgPolylinePoints } from '@/entities/activity/lib/route-projection';
import type {
  ShareMapSettings,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_MAP_TILT_PITCH,
  createShareMapStyle,
  getLngLatBounds,
  getRouteLngLats,
} from '@/entities/activity/model/activity-share/activity-share-map';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';

/** Время ожидания тайлов перед экспортом: дальше рендерим то, что успело загрузиться. */
const READY_TIMEOUT_MS = 8000;
/** Итерации подгонки камеры под наклон: обычно хватает двух-трёх. */
const FIT_ITERATIONS = 4;
const MAX_FIT_ZOOM = 16;

export type MapFitPadding = { top: number; right: number; bottom: number; left: number };

const props = defineProps<{
  map: ShareMapSettings;
  track: ITrackPoint[];
  routeVisible: boolean;
  routeStyle: ShareRouteStyle;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  /** Поля, в которые трек не заходит, в долях ширины/высоты карты (место под название и показатели). */
  fitPadding: MapFitPadding;
}>();

const container = useTemplateRef<HTMLElement>('container');
const instance = shallowRef<maplibregl.Map | null>(null);
/** Размер карты в пикселях раскладки (не экрана: карточка масштабируется transform). */
const size = shallowRef({ width: 0, height: 0 });
/** Трек в пикселях карты — рисуется поверх SVG теми же стилями, что и без карты. */
const projected = shallowRef<RoutePoint[]>([]);

const lngLats = computed(() => getRouteLngLats(props.track));
const bounds = computed(() => getLngLatBounds(lngLats.value));
const pitch = computed(() => (props.map.tilted ? SHARE_MAP_TILT_PITCH : 0));

const points = computed(() => toSvgPolylinePoints(projected.value));
const start = computed(() => projected.value[0] ?? null);
/** Сколько пикселей карты в одной единице слоя трека (ширина карточки = 1000). */
const unit = computed(() => size.value.width / ROUTE_LAYER_WIDTH);
const viewBox = computed(() => `0 0 ${size.value.width} ${size.value.height}`);

function project(map: maplibregl.Map): RoutePoint[] {
  return lngLats.value.map((lngLat) => {
    const point = map.project(lngLat);
    return { x: point.x, y: point.y };
  });
}

/**
 * Вписывает трек в карту целиком. При наклоне перспектива искажает трек,
 * поэтому после первого приближения камера подгоняется по реальной проекции:
 * зум — по размеру, центр — по смещению проекции от центра свободной области.
 */
function fitRoute(map: maplibregl.Map) {
  const { width, height } = size.value;
  if (!bounds.value || !width || !height) return;

  const padding = {
    top: props.fitPadding.top * height,
    bottom: props.fitPadding.bottom * height,
    left: props.fitPadding.left * width,
    right: props.fitPadding.right * width,
  };
  const camera = map.cameraForBounds(bounds.value, { padding, maxZoom: MAX_FIT_ZOOM });
  if (!camera) return;
  map.jumpTo({ ...camera, bearing: 0, pitch: pitch.value });

  const areaWidth = width - padding.left - padding.right;
  const areaHeight = height - padding.top - padding.bottom;
  const areaX = padding.left + areaWidth / 2;
  const areaY = padding.top + areaHeight / 2;

  for (let step = 0; step < FIT_ITERATIONS && pitch.value; step++) {
    const box = getBox(project(map));
    const ratio = Math.max((box.maxX - box.minX) / areaWidth, (box.maxY - box.minY) / areaHeight);
    if (!Number.isFinite(ratio) || ratio <= 0) break;

    // Сдвигаем центр так, чтобы середина проекции трека встала в середину области.
    const shift = map.unproject([
      width / 2 + (box.minX + box.maxX) / 2 - areaX,
      height / 2 + (box.minY + box.maxY) / 2 - areaY,
    ]);
    map.jumpTo({
      center: shift,
      zoom: Math.min(MAX_FIT_ZOOM, map.getZoom() - Math.log2(ratio)),
    });
  }

  projected.value = project(map);
}

function getBox(list: RoutePoint[]) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const { x, y } of list) {
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
  }
  return box;
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const element = container.value;
  if (!element) return;
  size.value = { width: element.offsetWidth, height: element.offsetHeight };

  const map = new maplibregl.Map({
    container: element,
    style: createShareMapStyle(props.map, props.backgroundColor),
    attributionControl: false,
    // Карта — фиксированная картинка под треком.
    interactive: false,
    // Иначе WebGL-холст пуст при снимке карточки в PNG.
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    maxPitch: SHARE_MAP_TILT_PITCH,
    fadeDuration: 0,
  });
  instance.value = map;
  fitRoute(map);

  resizeObserver = new ResizeObserver(() => {
    const next = { width: element.offsetWidth, height: element.offsetHeight };
    if (next.width === size.value.width && next.height === size.value.height) return;
    size.value = next;
    map.resize();
    fitRoute(map);
  });
  resizeObserver.observe(element);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  instance.value?.remove();
  instance.value = null;
});

watch(
  () => [props.map.base, props.backgroundColor] as const,
  () => instance.value?.setStyle(createShareMapStyle(props.map, props.backgroundColor)),
);

watch(
  () => [props.map.tilted, props.fitPadding, props.track] as const,
  () => {
    if (instance.value) fitRoute(instance.value);
  },
);

/** Ждёт, пока карта догрузит тайлы и дорисуется (перед экспортом в PNG). */
async function whenReady(): Promise<void> {
  const map = instance.value;
  if (!map) return;
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, READY_TIMEOUT_MS);
    map.once('idle', () => {
      window.clearTimeout(timer);
      resolve();
    });
    map.triggerRepaint();
  });
}

defineExpose({ whenReady });
</script>

<template>
  <div class="artwork-map">
    <div ref="container" class="artwork-map__canvas" />
    <svg
      v-if="routeVisible && projected.length"
      class="artwork-map__route"
      :viewBox="viewBox"
      aria-hidden="true"
    >
      <RouteStyleLayers
        :points="points"
        :start="start"
        :style-id="routeStyle"
        :route-color="routeColor"
        :text-color="textColor"
        :background-color="backgroundColor"
        :unit="unit"
      />
    </svg>
  </div>
</template>

<style scoped>
.artwork-map {
  position: relative;
  overflow: hidden;
}

.artwork-map__canvas,
.artwork-map__route {
  position: absolute;
  inset: 0;
}

.artwork-map__route {
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
</style>
