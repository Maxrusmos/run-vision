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
  SHARE_MAP_MAX_PITCH,
  createShareMapStyle,
  getLngLatBounds,
  getKmMarkers,
  getRouteLngLats,
  spreadKmMarkers,
  MARKER_SPACING,
  type MapFitPadding,
} from '@/entities/activity/model/activity-share/activity-share-map';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';
import RouteMarkers from '@/views/photo-editor-view/components/artwork/RouteMarkers.vue';
import VideoDotMark from '@/views/photo-editor-view/components/artwork/VideoDotMark.vue';
import {
  buildTrackTimeline,
  getTrackLocation,
} from '@/entities/activity/model/activity-share/activity-share-video';

/** Время ожидания тайлов перед экспортом: дальше рендерим то, что успело загрузиться. */
const READY_TIMEOUT_MS = 8000;
/** Итерации подгонки камеры под наклон: обычно хватает двух-трёх. */
const FIT_ITERATIONS = 4;
const MAX_FIT_ZOOM = 16;
/** Точек трека для подгонки камеры: хватает для рамки, а считается быстро (и при вращении пальцами). */
const FIT_SAMPLE_POINTS = 400;

const props = defineProps<{
  map: ShareMapSettings;
  /** Наклон и поворот — общие с треком (меню «Трек»). */
  pitch: number;
  bearing: number;
  kmMarkers: boolean;
  startFinish: boolean;
  track: ITrackPoint[];
  routeVisible: boolean;
  routeStyle: ShareRouteStyle;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  /** Поля, в которые трек не заходит, в долях ширины/высоты карты (место под название и показатели). */
  fitPadding: MapFitPadding;
  /** Видео: точка на треке прошла эту долю дистанции; null — точки нет (фото). */
  progress?: number | null;
}>();

const root = useTemplateRef<HTMLElement>('root');
const container = useTemplateRef<HTMLElement>('container');
const instance = shallowRef<maplibregl.Map | null>(null);
/** Размер карты в пикселях раскладки (не экрана: карточка масштабируется transform). */
const size = shallowRef({ width: 0, height: 0 });
/** Трек в пикселях карты — рисуется поверх SVG теми же стилями, что и без карты. */
const projected = shallowRef<RoutePoint[]>([]);

const lngLats = computed(() => getRouteLngLats(props.track));
const kmMarkers = computed(() => (props.kmMarkers ? getKmMarkers(props.track) : []));
/** Флажки километров в пикселях карты. */
const projectedKm = shallowRef<(RoutePoint & { km: number })[]>([]);
const bounds = computed(() => getLngLatBounds(lngLats.value));
const pitch = computed(() => props.pitch);

const points = computed(() => toSvgPolylinePoints(projected.value));
const start = computed(() => projected.value[0] ?? null);
const finish = computed(() => projected.value[projected.value.length - 1] ?? null);
/** Сколько пикселей карты в одной единице слоя трека (ширина карточки = 1000). */
const unit = computed(() => size.value.width / ROUTE_LAYER_WIDTH);
const viewBox = computed(() => `0 0 ${size.value.width} ${size.value.height}`);

const fitSample = computed(() => {
  const all = lngLats.value;
  const stride = Math.max(1, Math.floor(all.length / FIT_SAMPLE_POINTS));
  return all.filter((_, index) => index % stride === 0 || index === all.length - 1);
});

function project(map: maplibregl.Map, points = lngLats.value): RoutePoint[] {
  return points.map((lngLat) => {
    const point = map.project(lngLat);
    return { x: point.x, y: point.y };
  });
}

/**
 * Вписывает трек в карту целиком при любом наклоне и повороте. `cameraForBounds`
 * вписывает рамку широт и долгот (при повороте — с запасом) и не знает о перспективе,
 * поэтому дальше камера подгоняется по реальной проекции трека: зум — по размеру,
 * центр — по смещению проекции от центра свободной области. Поворот — всегда вокруг
 * трека: он остаётся по центру и целиком в кадре.
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
  const bearing = props.bearing;
  const camera = map.cameraForBounds(bounds.value, { padding, maxZoom: MAX_FIT_ZOOM, bearing });
  if (!camera) return;
  map.jumpTo({ ...camera, bearing, pitch: pitch.value });

  const areaWidth = width - padding.left - padding.right;
  const areaHeight = height - padding.top - padding.bottom;
  const areaX = padding.left + areaWidth / 2;
  const areaY = padding.top + areaHeight / 2;

  for (let step = 0; step < FIT_ITERATIONS && (pitch.value || bearing); step++) {
    const box = getBox(project(map, fitSample.value));
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
  projectKmMarkers(map);
}

/** Флажки километров в пикселях карты (без наложений — см. `spreadKmMarkers`). */
function projectKmMarkers(map: maplibregl.Map) {
  projectedKm.value = spreadKmMarkers(
    kmMarkers.value.map((marker) => {
      const { x, y } = map.project(marker.lngLat);
      return { x, y, km: marker.km };
    }),
    props.startFinish && start.value && finish.value ? [start.value, finish.value] : [],
    MARKER_SPACING * unit.value,
  );
}

watch([kmMarkers, () => props.startFinish], () => {
  if (instance.value) projectKmMarkers(instance.value);
});

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
    maxPitch: SHARE_MAP_MAX_PITCH,
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
  cancelAnimationFrame(fitFrame);
  resizeObserver?.disconnect();
  instance.value?.remove();
  instance.value = null;
});

watch(
  () => [props.map.style, props.backgroundColor] as const,
  () => instance.value?.setStyle(createShareMapStyle(props.map, props.backgroundColor)),
);

// Вращение пальцами меняет угол на каждом кадре — подгоняем камеру не чаще кадра.
let fitFrame = 0;
watch(
  () => [props.pitch, props.bearing, props.fitPadding, props.track] as const,
  () => {
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      if (instance.value) fitRoute(instance.value);
    });
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

// Видео: точка — между уже спроецированными точками трека (индексы как у `getRouteLngLats`).
const timeline = computed(() => buildTrackTimeline(props.track));

/** Где точка, прошедшая долю `progress` дистанции, — в пикселях карты. */
function getDotPoint(progress: number): RoutePoint | null {
  const list = projected.value;
  const { index, t } = getTrackLocation(timeline.value, progress);
  const a = list[index];
  const b = list[index + 1] ?? a;
  if (!a || !b) return null;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

const dotPoint = computed(() =>
  props.progress === null || props.progress === undefined ? null : getDotPoint(props.progress),
);

defineExpose({
  whenReady,
  /** Карта в документе: её размер на экране переводит пиксели карты в пиксели карточки. */
  getElement: () => root.value,
  getDotPoint,
  /** Пикселей карты в единице слоя трека. */
  getUnit: () => unit.value,
});
</script>

<template>
  <div ref="root" class="artwork-map">
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
      <RouteMarkers
        :km-points="projectedKm"
        :start="start"
        :finish="finish"
        :start-finish="startFinish"
        :text-color="textColor"
        :background-color="backgroundColor"
        :unit="unit"
      />
      <!-- Видео: точка на треке (в кадры видео её рисует холст). -->
      <VideoDotMark
        v-if="dotPoint"
        :x="dotPoint.x"
        :y="dotPoint.y"
        :route-color="routeColor"
        :ring-color="textColor"
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
