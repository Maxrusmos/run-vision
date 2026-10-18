<script setup lang="ts">
import type { ShareVideoDotSettings } from '@/entities/activity/model/activity-share/activity-share.types';
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
import {
  getFlagReach,
  type RouteFlagKey,
  type RouteFlagPoint,
} from '@/entities/activity/model/activity-share/route-flags';

/** Время ожидания тайлов перед экспортом: дальше рендерим то, что успело загрузиться. */
const READY_TIMEOUT_MS = 8000;
/** Итерации подгонки камеры под наклон: обычно хватает двух-трёх. */
const FIT_ITERATIONS = 4;
const MAX_FIT_ZOOM = 16;
/** Точек трека для подгонки камеры: хватает для рамки, а считается быстро (и при вращении пальцами). */
const FIT_SAMPLE_POINTS = 400;
/** Под трек остаётся не меньше этой доли карты, сколько бы ни было показателей. */
const MIN_FIT_AREA = 0.05;

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
  /** Видео: стиль, цвет и фото точки. */
  videoDot?: ShareVideoDotSettings;
  progress?: number | null;
  /**
   * Видео: масштаб флажка по его доле дистанции (0 — точка не дошла, потом «выпрыгивает»);
   * null — фото, флажки видны все.
   */
  flagPop?: ((reach: number) => number) | null;
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
 * Поля вокруг свободной области в пикселях карты. Если полей больше, чем места (очень
 * много показателей), они ужимаются: под трек остаётся хотя бы `MIN_FIT_AREA` карты —
 * иначе `cameraForBounds` возвращает undefined и камера не обновлялась вовсе.
 */
function getFitPadding(width: number, height: number) {
  const fit = (start: number, end: number, size: number) => {
    const total = (start + end) * size;
    const limit = size * (1 - MIN_FIT_AREA);
    const ratio = total > limit ? limit / total : 1;
    return [start * size * ratio, end * size * ratio] as const;
  };
  const [top, bottom] = fit(props.fitPadding.top, props.fitPadding.bottom, height);
  const [left, right] = fit(props.fitPadding.left, props.fitPadding.right, width);
  return { top, bottom, left, right };
}

/**
 * Вписывает трек в карту целиком при любом наклоне и повороте. Камера смотрит в центр
 * свободной области: `padding` камеры смещает туда и центр карты, и точку схода
 * перспективы. Без этого при высокой карточке (много показателей) область оказывалась
 * у верхнего края, далеко к горизонту наклонённой карты, подгонка не сходилась и трек
 * при повороте улетал за карточку (было).
 * `cameraForBounds` вписывает рамку широт и долгот (при повороте — с запасом) и не знает
 * о перспективе, поэтому дальше камера подгоняется по реальной проекции трека: зум — по
 * размеру, центр — по смещению середины проекции от центра области. Поворот — всегда
 * вокруг трека: он остаётся по центру и целиком в кадре.
 */
function fitRoute(map: maplibregl.Map) {
  const { width, height } = size.value;
  if (!bounds.value || !width || !height) return;

  const padding = getFitPadding(width, height);
  const bearing = props.bearing;
  // Сначала поля камеры: `cameraForBounds` учитывает их сам (свои поля ему уже не нужны).
  map.jumpTo({ padding });
  const camera = map.cameraForBounds(bounds.value, { maxZoom: MAX_FIT_ZOOM, bearing });
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

    // Центр карты стоит в центре области: новый центр — точка под серединой проекции трека.
    const middleX = (box.minX + box.maxX) / 2;
    const middleY = (box.minY + box.maxY) / 2;
    const isFitted =
      Math.abs(middleX - areaX) < 0.5 &&
      Math.abs(middleY - areaY) < 0.5 &&
      Math.abs(ratio - 1) < 0.01;
    if (isFitted) break;
    map.jumpTo({
      center: map.unproject([middleX, middleY]),
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

/** Видео: масштаб флажка — по его месту на треке. */
const flagScale = computed(() => {
  const pop = props.flagPop;
  if (!pop) return null;
  const total = timeline.value.totalDistance;
  return (flag: RouteFlagKey) => pop(getFlagReach(flag, total));
});

/** Флажки для кадров видео — в пикселях карты (как и точка). */
function getFlags(): RouteFlagPoint[] {
  if (!props.routeVisible) return [];
  const total = timeline.value.totalDistance;
  const flags: RouteFlagPoint[] = projectedKm.value.map((point) => ({
    x: point.x,
    y: point.y,
    flag: point.km,
    reach: getFlagReach(point.km, total),
  }));
  if (props.startFinish && finish.value) flags.push({ ...finish.value, flag: 'finish', reach: 1 });
  return flags;
}

const dotPoint = computed(() =>
  props.progress === null || props.progress === undefined ? null : getDotPoint(props.progress),
);

defineExpose({
  whenReady,
  /** Карта в документе: её размер на экране переводит пиксели карты в пиксели карточки. */
  getElement: () => root.value,
  getDotPoint,
  getFlags,
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
        :flag-scale="flagScale"
      />
      <!-- Видео: точка на треке (в кадры видео её рисует холст). -->
      <VideoDotMark
        v-if="dotPoint"
        :x="dotPoint.x"
        :y="dotPoint.y"
        :route-color="videoDot?.color ?? routeColor"
        :ring-color="textColor"
        :background-color="backgroundColor"
        :dot="videoDot"
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
