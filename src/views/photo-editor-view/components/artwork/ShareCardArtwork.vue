<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardElement,
  ShareCardSettings,
  ShareColorKey,
  ShareRoutePosition,
  ShareStat,
  ShareStatKey,
  ShareStatPosition,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { getShareStatCardLabel } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import { ROUTE_SLOT_HEIGHT_RATIO } from '@/entities/activity/model/activity-share/activity-share-route';
import { eventPathMatches } from '@/shared/lib/dom/event-path';
import ArtworkBackground from '@/views/photo-editor-view/components/artwork/ArtworkBackground.vue';
import ArtworkTitle from '@/views/photo-editor-view/components/artwork/ArtworkTitle.vue';
import ArtworkRoute from '@/views/photo-editor-view/components/artwork/ArtworkRoute.vue';
import ArtworkStatsGrid from '@/views/photo-editor-view/components/artwork/ArtworkStatsGrid.vue';
import ArtworkMap from '@/views/photo-editor-view/components/artwork/ArtworkMap.vue';
import ArtworkElevation from '@/views/photo-editor-view/components/artwork/ArtworkElevation.vue';
import type { MapFitPadding } from '@/entities/activity/model/activity-share/activity-share-map';
import { getElevationSizeRatio } from '@/entities/activity/model/activity-share/activity-share-elevation';
import type { StatLayout } from '@/entities/activity/model/activity-share/activity-share-stat-layout';

const BLOCK_MAP_FIT_PADDING: MapFitPadding = { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 };
/** Карта во весь фон: поля вокруг свободной области (между названием и графиком/показателями). */
const FULL_MAP_SIDE_PADDING = 0.1;
const FULL_MAP_AREA_MARGIN = 0.04;

/** Минимальный зазор между показателями, чтобы они не слипались. */
const MIN_STAT_GAP = 1;

const props = defineProps<{
  activity: IActivity;
  settings: ShareCardSettings;
  /** Значения всех показателей тренировки. */
  statValues: Record<ShareStatKey, string>;
  /** Скрывает элементы редактора перед рендером в PNG. */
  exporting?: boolean;
}>();

const emit = defineEmits<{
  setColor: [key: ShareColorKey, color: string];
  removeStat: [key: ShareStatKey];
  setStatPositions: [positions: Partial<Record<ShareStatKey, ShareStatPosition>>];
  setStatWidth: [key: ShareStatKey, width: ShareStatWidth];
  setRouteScale: [scale: number];
  setRoutePosition: [position: ShareRoutePosition];
  removeRoute: [];
  setTitle: [value: string];
  removeTitle: [];
  removeElevation: [];
  moveElevation: [row: number, layout: StatLayout];
  rotateMap: [bearing: number];
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

const rootElement = useTemplateRef<HTMLElement>('root');
const routeSlot = useTemplateRef<HTMLElement>('routeSlot');
const mapRef = useTemplateRef<InstanceType<typeof ArtworkMap>>('map');

/** Высота области над показателями (карта и график) — до первой строки; 0 — не измерено. */
const visualHeight = ref(0);
const mapLayout = computed(() => props.settings.map?.layout ?? null);

const elevation = computed(() =>
  props.settings.elevation?.visible ? props.settings.elevation : null,
);
const elevationRatio = computed(() =>
  elevation.value ? getElevationSizeRatio(elevation.value.size) : 0,
);

/** Место над показателями (доля ширины): трек или карта. */
const reservedRatio = computed(() =>
  props.settings.routeVisible || props.settings.map ? ROUTE_SLOT_HEIGHT_RATIO : 0,
);

/** График высоты — полоса в сетке показателей: его можно переставлять между строками. */
const elevationBand = computed(() =>
  elevation.value ? { row: elevation.value.row, ratio: elevationRatio.value } : null,
);

// Карта во весь фон: трек вписывается в свободную область — между названием и показателями.
const mapArea = useTemplateRef<HTMLElement>('mapArea');
const fullFitPadding = ref<MapFitPadding>({
  top: 0.2,
  right: FULL_MAP_SIDE_PADDING,
  bottom: 0.42,
  left: FULL_MAP_SIDE_PADDING,
});
let areaObserver: ResizeObserver | null = null;

function measureMapArea() {
  const root = rootElement.value;
  const area = mapArea.value;
  if (!root || !area) return;
  // Доли от размера карточки — масштаб transform на них не влияет.
  const rootRect = root.getBoundingClientRect();
  const areaRect = area.getBoundingClientRect();
  if (!rootRect.height) return;
  const top = (areaRect.top - rootRect.top) / rootRect.height + FULL_MAP_AREA_MARGIN;
  const bottom = (rootRect.bottom - areaRect.bottom) / rootRect.height + FULL_MAP_AREA_MARGIN;
  const current = fullFitPadding.value;
  if (Math.abs(current.top - top) < 0.005 && Math.abs(current.bottom - bottom) < 0.005) return;
  fullFitPadding.value = { ...current, top, bottom };
}

watch(mapArea, (area) => {
  areaObserver?.disconnect();
  areaObserver = null;
  if (!area || !rootElement.value) return;
  areaObserver = new ResizeObserver(measureMapArea);
  areaObserver.observe(area);
  areaObserver.observe(rootElement.value);
});

onBeforeUnmount(() => areaObserver?.disconnect());

/**
 * Вращение карты двумя пальцами — по всей карточке: карта лежит под названием
 * и показателями, и попасть по ней пальцами было бы трудно.
 */
let twist: { angle: number; bearing: number } | null = null;

function touchAngle(event: TouchEvent): number | null {
  const [a, b] = [event.touches[0], event.touches[1]];
  if (!a || !b) return null;
  return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
}

function handleTouchStart(event: TouchEvent) {
  const angle = props.settings.map ? touchAngle(event) : null;
  twist = angle === null ? null : { angle, bearing: props.settings.map!.bearing };
}

function handleTouchMove(event: TouchEvent) {
  const angle = touchAngle(event);
  if (!twist || angle === null) return;
  // Иначе браузер масштабирует страницу.
  event.preventDefault();
  // Пальцы по часовой — карта тоже по часовой, то есть угол (bearing) уменьшается.
  emit('rotateMap', twist.bearing - (angle - twist.angle));
}

function handleTouchEnd(event: TouchEvent) {
  if (event.touches.length < 2) twist = null;
}

function removeElevation() {
  selected.value = null;
  emit('removeElevation');
}

const title = computed(() => props.settings.title ?? (props.activity.name || 'Тренировка'));

defineExpose({
  /** Корневой DOM-элемент карточки — его рендерим в PNG. */
  getElement: () => rootElement.value,
  /** Дождаться отрисовки карты перед экспортом. */
  whenReady: async () => {
    await mapRef.value?.whenReady();
  },
});

const stats = computed<ShareStat[]>(() =>
  props.settings.visibleStats.map((key) => ({
    key,
    label: getShareStatCardLabel(key),
    value: props.statValues[key],
  })),
);

const cssVariables = computed(() => {
  const spacing = props.settings.statSpacing;

  return {
    '--share-background': props.settings.backgroundColor,
    '--share-route': props.settings.routeColor,
    '--share-text': props.settings.textColor,
    '--share-stat-gap': `${Math.max(MIN_STAT_GAP, spacing)}px`,
    '--share-stat-padding-y': `${1 + spacing * 0.35}px`,
    '--share-stat-padding-x': `${4 + spacing / 3}px`,
  };
});

// Тап мимо выделенного элемента снимает выделение.
function handleClick(event: MouseEvent) {
  if (!eventPathMatches(event, '[data-selectable]')) {
    selected.value = null;
  }
}

function removeTitle() {
  selected.value = null;
  emit('removeTitle');
}

function removeRoute() {
  selected.value = null;
  emit('removeRoute');
}
</script>

<template>
  <div
    ref="root"
    class="share-artwork"
    :class="{
      'share-artwork--transparent': settings.transparentBackground && !settings.map,
      'share-artwork--map-full': mapLayout === 'full',
      'share-artwork--map': settings.map,
      'share-artwork--exporting': exporting,
    }"
    :style="cssVariables"
    @click="handleClick"
    @touchstart.passive="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend.passive="handleTouchEnd"
    @touchcancel.passive="handleTouchEnd"
  >
    <!-- Карта во весь фон: под всеми элементами, снизу — затемнение под показатели. -->
    <template v-if="settings.map && mapLayout === 'full'">
      <ArtworkMap
        ref="map"
        class="share-artwork__map-full"
        :map="settings.map"
        :track="activity.track"
        :route-visible="settings.routeVisible"
        :route-style="settings.routeStyle"
        :route-color="settings.routeColor"
        :text-color="settings.textColor"
        :background-color="settings.backgroundColor"
        :fit-padding="fullFitPadding"
      />
      <div class="share-artwork__map-scrim" aria-hidden="true" />
    </template>

    <ArtworkBackground
      v-else
      :transparent="settings.transparentBackground"
      :image="settings.backgroundImage"
      :image-fit="settings.backgroundImageFit"
      :image-position="settings.backgroundImagePosition"
    />

    <div v-if="settings.titleVisible" class="share-artwork__header">
      <ArtworkTitle
        :value="title"
        :selected="selected === 'title'"
        @select="selected = 'title'"
        @change="emit('setTitle', $event)"
        @remove="removeTitle"
      />
    </div>

    <div class="share-artwork__body">
      <!-- Место под трек: задаёт его исходные положение и размер (M). -->
      <div
        v-if="settings.routeVisible && !settings.map"
        ref="routeSlot"
        class="share-artwork__route-slot"
        :style="{ aspectRatio: 1 / ROUTE_SLOT_HEIGHT_RATIO }"
      />
      <!-- Над показателями: карта блоком (или свободная область карты во весь фон).
           Высота — до первой строки показателей. -->
      <div
        v-if="settings.map"
        class="share-artwork__visual"
        :style="visualHeight ? { height: `${visualHeight}px` } : { aspectRatio: 1 / reservedRatio }"
      >
        <ArtworkMap
          v-if="mapLayout === 'block'"
          ref="map"
          class="share-artwork__map-block"
          :map="settings.map"
          :track="activity.track"
          :route-visible="settings.routeVisible"
          :route-style="settings.routeStyle"
          :route-color="settings.routeColor"
          :text-color="settings.textColor"
          :background-color="settings.backgroundColor"
          :fit-padding="BLOCK_MAP_FIT_PADDING"
        />
        <div v-else ref="mapArea" class="share-artwork__map-area" />
      </div>

      <!-- Показатели раскладываются по сетке на всей высоте — от названия до низа. -->
      <ArtworkStatsGrid
        v-model:selected="selected"
        :stats="stats"
        :stat-widths="settings.statWidths"
        :stat-positions="settings.statPositions"
        :reserved-height-ratio="reservedRatio"
        @remove="emit('removeStat', $event)"
        @set-width="(key, width) => emit('setStatWidth', key, width)"
        :stat-style="settings.statStyle"
        @set-layout="emit('setStatPositions', $event)"
        @reserved-height="visualHeight = $event"
        :band="elevationBand"
        @move-band="(row, layout) => emit('moveElevation', row, layout)"
      >
        <template #band>
          <ArtworkElevation
            v-if="elevation"
            :track="activity.track"
            :settings="elevation"
            :color="elevation.color ?? settings.routeColor"
            :text-color="settings.textColor"
            :selected="selected === 'elevation'"
            @select="selected = selected === 'elevation' ? null : 'elevation'"
            @remove="removeElevation"
          />
        </template>
      </ArtworkStatsGrid>

      <!-- Трек двигается по всей области: от низа названия до низа карточки. -->
      <ArtworkRoute
        v-if="settings.routeVisible && !settings.map"
        class="share-artwork__route"
        :track="activity.track"
        :color="settings.routeColor"
        :text-color="settings.textColor"
        :background-color="settings.backgroundColor"
        :route-style="settings.routeStyle"
        :scale="settings.routeScale"
        :position="settings.routePosition"
        :selected="selected === 'route'"
        :slot-element="routeSlot"
        @select="selected = 'route'"
        @set-scale="emit('setRouteScale', $event)"
        @set-position="emit('setRoutePosition', $event)"
        @remove="removeRoute"
      />
    </div>
  </div>
</template>

<style scoped>
.share-artwork {
  --share-background: #111827;
  --share-route: #fff;
  --share-text: #fff;
  --share-stat-gap: 12px;
  --share-stat-padding-y: 6px;
  --share-stat-padding-x: 8px;
  /* Одинаковый отступ со всех сторон карточки. */
  --share-card-padding: 16px;

  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  padding: var(--share-card-padding);
  overflow: hidden;
  border-radius: 16px;
  font-family: Inter, Arial, sans-serif;
  color: var(--share-text);
  background: var(--share-background);
}

.share-artwork--map {
  /* Два пальца по карточке с картой — вращение карты, а не масштаб страницы. */
  touch-action: pan-x pan-y;
}

.share-artwork--transparent {
  background: transparent;
}

.share-artwork__header {
  position: relative;
  z-index: 4;
}

/* Карта во весь фон — от края до края карточки. */
.share-artwork__map-full {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* Плавный переход в цвет фона снизу: показатели читаются на любой карте.
   Обычный градиент — html-to-image переносит его в PNG без потерь. */
.share-artwork__map-scrim {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  height: 48%;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in srgb, var(--share-background) 85%, transparent) 70%
  );
  pointer-events: none;
}

.share-artwork__visual {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Сквозь пустые места касания проходят к карте; график ловит свои. */
  pointer-events: none;
}

.share-artwork__map-block {
  flex: 1 1 0;
  min-height: 0;
  border-radius: 12px;
}

.share-artwork__map-area {
  flex: 1 1 0;
  min-height: 0;
}

/* Без z-index: тело не создаёт свой контекст наложения,
   поэтому выделенный трек может подняться над названием. */
.share-artwork__body {
  position: relative;
  margin-top: 16px;
}

.share-artwork__route-slot {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  pointer-events: none;
}

/* Слой трека: от низа названия до низа карточки, на всю ширину.
   Порядок наложения его частей задан внутри ArtworkRoute. */
.share-artwork__route {
  position: absolute;
  top: -16px;
  right: calc(-1 * var(--share-card-padding));
  bottom: calc(-1 * var(--share-card-padding));
  left: calc(-1 * var(--share-card-padding));
}
</style>
