<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { maplibregl } from '@/shared/lib/map/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareMapSettings,
  ShareMapView,
  ShareRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  SHARE_MAP_TILT_PITCH,
  createRouteGeoJson,
  createShareMapStyle,
  getRouteLngLatBounds,
  getShareMapAttribution,
} from '@/entities/activity/model/activity-share/activity-share-map';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';

/** При наклоне дальняя часть трека уходит вдаль — приближаем, чтобы он не мельчал. */
const TILTED_FIT_ZOOM_BOOST = 0.5;

/** Время ожидания тайлов перед экспортом: дальше рендерим то, что успело загрузиться. */
const READY_TIMEOUT_MS = 8000;

const props = defineProps<{
  map: ShareMapSettings;
  track: ITrackPoint[];
  routeVisible: boolean;
  routeStyle: ShareRouteStyle;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  /** Отступы вписывания трека в долях высоты/ширины карты: место под название и показатели. */
  fitPadding: { top: number; right: number; bottom: number; left: number };
}>();

const emit = defineEmits<{
  setView: [view: ShareMapView];
}>();

const container = useTemplateRef<HTMLElement>('container');
const instance = shallowRef<maplibregl.Map | null>(null);
/** Ширина карты в пикселях раскладки (не экрана: карточка масштабируется transform). */
const width = shallowRef(0);

const route = computed(() => createRouteGeoJson(props.track));
const bounds = computed(() => getRouteLngLatBounds(route.value));
const attribution = computed(() => getShareMapAttribution(props.map));

const style = computed(() =>
  createShareMapStyle(props.map, route.value, {
    visible: props.routeVisible,
    style: props.routeStyle,
    routeColor: props.routeColor,
    textColor: props.textColor,
    backgroundColor: props.backgroundColor,
    unit: width.value / ROUTE_LAYER_WIDTH,
  }),
);

const pitch = computed(() => (props.map.tilted ? SHARE_MAP_TILT_PITCH : 0));

function fitPaddingPx(element: HTMLElement) {
  const { offsetWidth: w, offsetHeight: h } = element;
  return {
    top: props.fitPadding.top * h,
    bottom: props.fitPadding.bottom * h,
    left: props.fitPadding.left * w,
    right: props.fitPadding.right * w,
  };
}

/** Камера по настройкам: сохранённый вид или трек целиком. */
function applyView(map: maplibregl.Map, animate: boolean) {
  const view = props.map.view;
  if (view) {
    const options = {
      center: view.center,
      zoom: view.zoom,
      bearing: view.bearing,
      pitch: pitch.value,
    };
    if (animate) map.easeTo({ ...options, duration: 400 });
    else map.jumpTo(options);
    return;
  }

  if (!bounds.value || !container.value) return;
  const camera = map.cameraForBounds(bounds.value, {
    padding: fitPaddingPx(container.value),
    maxZoom: 16,
  });
  if (!camera) return;
  const zoom = (camera.zoom ?? map.getZoom()) + (props.map.tilted ? TILTED_FIT_ZOOM_BOOST : 0);
  const options = { ...camera, zoom, bearing: 0, pitch: pitch.value };
  if (animate) map.easeTo({ ...options, duration: 400 });
  else map.jumpTo(options);
}

function isSameView(map: maplibregl.Map, view: ShareMapView | null) {
  if (!view) return false;
  const center = map.getCenter();
  return (
    Math.abs(center.lng - view.center[0]) < 1e-7 &&
    Math.abs(center.lat - view.center[1]) < 1e-7 &&
    Math.abs(map.getZoom() - view.zoom) < 1e-4 &&
    Math.abs(map.getBearing() - view.bearing) < 1e-3
  );
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const element = container.value;
  if (!element) return;
  width.value = element.offsetWidth;

  const map = new maplibregl.Map({
    container: element,
    style: style.value,
    attributionControl: false,
    // Иначе WebGL-холст пуст при снимке карточки в PNG.
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    // Наклон задаётся переключателем в меню, не жестом.
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: SHARE_MAP_TILT_PITCH,
    fadeDuration: 0,
  });
  instance.value = map;
  applyView(map, false);

  // Положение, выставленное пальцами, сохраняем в настройки (и в историю отмены).
  map.on('moveend', (event) => {
    if (!('originalEvent' in event) || !event.originalEvent) return;
    const center = map.getCenter();
    emit('setView', {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
    });
  });

  let height = element.offsetHeight;
  resizeObserver = new ResizeObserver(() => {
    if (element.offsetWidth === width.value && element.offsetHeight === height) return;
    width.value = element.offsetWidth;
    height = element.offsetHeight;
    map.resize();
    if (!props.map.view) applyView(map, false);
  });
  resizeObserver.observe(element);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  instance.value?.remove();
  instance.value = null;
});

watch(style, (value) => instance.value?.setStyle(value));

// Отмена/сброс/переключение наклона и вида карточки — камера догоняет настройки.
watch(
  () => [props.map.view, props.map.tilted, props.map.layout] as const,
  () => {
    const map = instance.value;
    if (map && !props.map.view) {
      applyView(map, true);
      return;
    }
    if (!map || isSameView(map, props.map.view)) {
      if (map && map.getPitch() !== pitch.value) map.easeTo({ pitch: pitch.value, duration: 400 });
      return;
    }
    applyView(map, true);
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
    <span class="artwork-map__attribution">{{ attribution }}</span>
  </div>
</template>

<style scoped>
.artwork-map {
  position: relative;
  overflow: hidden;
}

.artwork-map__canvas {
  position: absolute;
  inset: 0;
}

.artwork-map__attribution {
  position: absolute;
  right: 6px;
  bottom: 4px;
  z-index: 1;
  font-size: 7px;
  line-height: 1;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 2px rgb(0 0 0 / 70%);
  pointer-events: none;
}
</style>
