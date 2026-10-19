<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardElement,
  ShareCardSettings,
  ShareColorKey,
  ShareWidgetKind,
  ShareWidgetSide,
  ShareRoutePosition,
  ShareStat,
  ShareStatKey,
  ShareStatPosition,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { getShareStatCardLabel } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import {
  ROUTE_LAYER_WIDTH,
  ROUTE_SLOT_HEIGHT_RATIO,
} from '@/entities/activity/model/activity-share/activity-share-route';
import { eventPathMatches } from '@/shared/lib/dom/event-path';
import ArtworkBackground from '@/views/photo-editor-view/components/artwork/ArtworkBackground.vue';
import ArtworkTitle from '@/views/photo-editor-view/components/artwork/ArtworkTitle.vue';
import ArtworkRoute from '@/views/photo-editor-view/components/artwork/ArtworkRoute.vue';
import ArtworkStatsGrid from '@/views/photo-editor-view/components/artwork/ArtworkStatsGrid.vue';
import ArtworkMap from '@/views/photo-editor-view/components/artwork/ArtworkMap.vue';
import ArtworkElevation from '@/views/photo-editor-view/components/artwork/ArtworkElevation.vue';
import { dragTrash } from '@/hooks/useDragTrash';
import BackgroundPattern from '@/views/photo-editor-view/components/artwork/BackgroundPattern.vue';
import CardDecor from '@/views/photo-editor-view/components/artwork/CardDecor.vue';
import ProWatermark from '@/views/photo-editor-view/components/artwork/ProWatermark.vue';
import {
  getProItemsInUse,
  isDecorVisible,
} from '@/entities/activity/model/activity-share/activity-share-pro';
import { useAccess } from '@/hooks/useAccess';
import ArtworkWidget from '@/views/photo-editor-view/components/artwork/ArtworkWidget.vue';
import {
  getWidgetKey,
  getWidgetRatio,
} from '@/entities/activity/model/activity-share/activity-share-widgets';
import type { MapFitPadding } from '@/entities/activity/model/activity-share/activity-share-map';
import { getElevationSizeRatio } from '@/entities/activity/model/activity-share/activity-share-elevation';
import type { BandState } from '@/entities/activity/model/activity-share/activity-share-stat-layout';
import {
  getTimeSinceReach,
  mapChartMarker,
  type VideoMarks,
} from '@/entities/activity/model/activity-share/activity-share-video';
import { getFlagPopScale } from '@/entities/activity/model/activity-share/route-flags';

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
  /** Видео: точка на треке прошла эту долю дистанции; null — фото, точки нет. */
  progress?: number | null;
  /** Видео: та же доля ступеньками, как у показателей (сплиты и зоны виджетов). */
  statProgress?: number | null;
  /** Видео: время ролика и его длительность — флажки «выпрыгивают», когда до них доходит точка. */
  videoTime?: number | null;
  videoDuration?: number | null;
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
  dropBands: [state: BandState];
  removeWidget: [kind: ShareWidgetKind];
  setWidgetSide: [kind: ShareWidgetKind, side: ShareWidgetSide | null];
  /** Поворот трека (с картой — и карты) двумя пальцами. */
  rotateRoute: [bearing: number];
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

const rootElement = useTemplateRef<HTMLElement>('root');
const routeSlot = useTemplateRef<HTMLElement>('routeSlot');
const mapRef = useTemplateRef<InstanceType<typeof ArtworkMap>>('map');
const routeRef = useTemplateRef<InstanceType<typeof ArtworkRoute>>('route');
const elevationRef = useTemplateRef<InstanceType<typeof ArtworkElevation>>('elevationChart');
/**
 * Виджеты — по ключу полосы. Ссылка-функция: виджеты рендерятся слотом сетки по одному,
 * и строковая ссылка хранила бы только последний.
 */
const widgetRefs = new Map<string, InstanceType<typeof ArtworkWidget>>();
function setWidgetRef(key: string, instance: unknown) {
  if (instance) widgetRefs.set(key, instance as InstanceType<typeof ArtworkWidget>);
  else widgetRefs.delete(key);
}

/** Видео: точку и маркер графика на время записи не рисуем — их рисует холст. */
const liveProgress = computed(() => (props.exporting ? null : (props.progress ?? null)));
/**
 * Видео: масштаб флажка по его доле дистанции. Пока пишется видео, флажки рисует холст
 * (с «выпрыгиванием» на каждом кадре), поэтому в самой карточке их нет.
 */
const flagPop = computed(() => {
  const time = props.videoTime;
  const duration = props.videoDuration;
  if (time === null || time === undefined || !duration) return null;
  if (props.exporting) return () => 0;
  return (reach: number) => getFlagPopScale(getTimeSinceReach(time, reach, duration));
});
/** Точка на карте — только если трек показан. */
const routeVisibleProgress = computed(() =>
  props.settings.routeVisible ? liveProgress.value : null,
);

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
  props.settings.routeVisible || props.settings.map || sideWidgets.value.length
    ? ROUTE_SLOT_HEIGHT_RATIO
    : 0,
);

/** Виджеты «Телеметрии» у краёв области трека — вертикальные «ленты». */
const sideWidgets = computed(() =>
  (props.settings.telemetry?.widgets ?? []).filter((widget) => widget.side),
);

function widgetsAt(side: ShareWidgetSide) {
  return sideWidgets.value.filter((widget) => widget.side === side);
}

/** Трек ужимается между боковыми колонками (две крайние колонки сетки из шести). */
function sideInset(side: ShareWidgetSide): string {
  return widgetsAt(side).length
    ? 'calc((100% - 5 * var(--share-stat-gap)) / 3 + var(--share-stat-gap) + 4px)'
    : '0px';
}

const areaStyle = computed(() =>
  visualHeight.value
    ? { height: `${visualHeight.value}px` }
    : { aspectRatio: `${1 / (reservedRatio.value || ROUTE_SLOT_HEIGHT_RATIO)}` },
);

/**
 * Полосы в сетке показателей — график высоты и виджеты «Телеметрии»:
 * занимают строку целиком и переставляются между строками.
 */
const bands = computed(() => {
  const list: {
    key: ShareCardElement;
    row: number | null;
    ratio: number;
    side: ShareWidgetSide | null;
  }[] = [];
  if (elevation.value) {
    list.push({
      key: 'elevation',
      row: elevation.value.row,
      ratio: elevationRatio.value,
      side: null,
    });
  }
  const telemetry = props.settings.telemetry;
  for (const widget of telemetry?.widgets ?? []) {
    list.push({
      key: getWidgetKey(widget.kind),
      row: widget.row,
      ratio: getWidgetRatio(widget.kind, telemetry!.size),
      side: widget.side,
    });
  }
  return list;
});

/** Вид виджета по ключу полосы `widget-<вид>`. */
function widgetKind(key: string): ShareWidgetKind | null {
  return key.startsWith('widget-') ? (key.slice('widget-'.length) as ShareWidgetKind) : null;
}

function selectBand(key: ShareCardElement) {
  selected.value = selected.value === key ? null : key;
}

function removeWidget(kind: ShareWidgetKind) {
  selected.value = null;
  emit('removeWidget', kind);
}

/** Полосу (график высоты или виджет) бросили в корзину. */
function removeBand(key: ShareCardElement) {
  const kind = widgetKind(key);
  if (kind) removeWidget(kind);
  else if (key === 'elevation') removeElevation();
}

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
 * Вращение карты (или трека без карты) двумя пальцами — по всей карточке: карта лежит
 * под названием и показателями, и попасть по ней (или по тонкой линии трека) было бы трудно.
 */
let twist: { angle: number; bearing: number } | null = null;

// Без карты и без трека вращать нечего.
const canTwist = computed(() => Boolean(props.settings.map) || props.settings.routeVisible);

function touchAngle(event: TouchEvent): number | null {
  const [a, b] = [event.touches[0], event.touches[1]];
  if (!a || !b) return null;
  return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
}

function handleTouchStart(event: TouchEvent) {
  const angle = canTwist.value ? touchAngle(event) : null;
  twist = angle === null ? null : { angle, bearing: props.settings.routeBearing };
}

function handleTouchMove(event: TouchEvent) {
  const angle = touchAngle(event);
  if (!twist || angle === null) return;
  // Иначе браузер масштабирует страницу.
  event.preventDefault();
  // Пальцы по часовой — карта (трек) тоже по часовой, то есть угол (bearing) уменьшается.
  emit('rotateRoute', twist.bearing - (angle - twist.angle));
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
  /**
   * Видео: где точка на треке и маркер на графике высоты для доли `progress` дистанции —
   * в пикселях раскладки карточки (без масштаба на экране) — и сколько таких пикселей
   * в единице слоя трека. Их рисует холст поверх кадра.
   */
  getVideoMarks: (progress: number): VideoMarks => {
    const root = rootElement.value;
    if (!root?.offsetWidth) return { dot: null, charts: [], flags: [] };
    // Экранные пиксели ≠ пиксели раскладки: карточка уменьшена под экран.
    const rootRect = root.getBoundingClientRect();
    const screenScale = rootRect.width / root.offsetWidth;
    /** Левый верхний угол элемента и масштаб его пикселей — в пикселях карточки. */
    const placeOf = (element: HTMLElement | null | undefined) => {
      if (!element?.offsetWidth) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: (rect.left - rootRect.left) / screenScale,
        top: (rect.top - rootRect.top) / screenScale,
        scale: rect.width / screenScale / element.offsetWidth,
      };
    };

    let dot: VideoMarks['dot'] = null;
    let flags: VideoMarks['flags'] = [];
    // Точка и флажки — в координатах трека: пиксели карты или единицы слоя трека.
    const source = props.settings.map
      ? (() => {
          const place = placeOf(mapRef.value?.getElement());
          if (!place || !mapRef.value) return null;
          const unit = mapRef.value.getUnit() * place.scale;
          return { place, scale: place.scale, unit, api: mapRef.value };
        })()
      : (() => {
          const layer = routeRef.value?.getLayerElement();
          const place = placeOf(layer);
          if (!layer || !place || !routeRef.value) return null;
          // Трек — в единицах слоя (ширина слоя = ROUTE_LAYER_WIDTH).
          const unit = (layer.offsetWidth * place.scale) / ROUTE_LAYER_WIDTH;
          return { place, scale: unit, unit, api: routeRef.value };
        })();
    if (source) {
      const toCard = ({ x, y }: { x: number; y: number }) => ({
        x: source.place.left + x * source.scale,
        y: source.place.top + y * source.scale,
      });
      const point = source.api.getDotPoint(progress);
      if (point) dot = { ...toCard(point), unit: source.unit };
      flags = source.api
        .getFlags()
        .map((flag) => ({ ...flag, ...toCard(flag), unit: source.unit }));
    }

    // Графики: высоты (полоса) и графики-виджеты — у каждого свой маркер и цвет.
    const charts: VideoMarks['charts'] = [];
    const chartSources = [elevationRef.value, ...widgetRefs.values()];
    for (const chart of chartSources) {
      const place = placeOf(chart?.getChartElement());
      const marker = chart?.getMarker(progress);
      if (!chart || !place || !marker) continue;
      const toCard = ({ x, y }: { x: number; y: number }) => ({
        x: place.left + x * place.scale,
        y: place.top + y * place.scale,
      });
      charts.push({
        ...mapChartMarker(marker, toCard),
        unit: chart.getUnit() * place.scale,
        color: chart.getColor(),
      });
    }
    return { dot, charts, flags };
  },
});

const stats = computed<ShareStat[]>(() =>
  props.settings.visibleStats.map((key) => ({
    key,
    label: getShareStatCardLabel(key),
    value: props.statValues[key],
  })),
);

// Pro-оформление без подписки — посмотреть можно, но поверх карточки водяные знаки.
const { canUse } = useAccess();
const showDecor = computed(() => isDecorVisible(props.settings));
const showProWatermark = computed(() =>
  getProItemsInUse(props.settings).some((item) => !canUse(item.feature)),
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
      'share-artwork--twist': canTwist,
      'share-artwork--exporting': exporting,
      // Элемент тащат к корзине: он виден и за краем карточки.
      'share-artwork--dragging': dragTrash.state.active,
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
        :pitch="settings.routePitch"
        :bearing="settings.routeBearing"
        :km-markers="settings.routeFlags"
        :start-finish="settings.routeFlags"
        :track="activity.track"
        :route-visible="settings.routeVisible"
        :route-style="settings.routeStyle"
        :route-color="settings.routeColor"
        :text-color="settings.textColor"
        :background-color="settings.backgroundColor"
        :fit-padding="fullFitPadding"
        :progress="routeVisibleProgress"
        :video-dot="settings.videoDot"
        :flag-pop="flagPop"
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

    <!-- Pro-оформление: фон-градиент с узором вместо сплошного цвета. -->
    <CardDecor v-if="showDecor && settings.backgroundDecor" :decor="settings.backgroundDecor" />

    <ProWatermark v-if="showProWatermark" />

    <!-- Узор-разметка фона (в «Телеметрии» по умолчанию — сетка, как на приборной панели). -->
    <BackgroundPattern
      v-if="settings.backgroundPattern !== 'none'"
      :pattern="settings.backgroundPattern"
      :color="settings.textColor"
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
        :style="{ ...areaStyle, left: sideInset('left'), right: sideInset('right') }"
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
          :pitch="settings.routePitch"
          :bearing="settings.routeBearing"
          :km-markers="settings.routeFlags"
          :start-finish="settings.routeFlags"
          :track="activity.track"
          :route-visible="settings.routeVisible"
          :route-style="settings.routeStyle"
          :route-color="settings.routeColor"
          :text-color="settings.textColor"
          :background-color="settings.backgroundColor"
          :fit-padding="BLOCK_MAP_FIT_PADDING"
          :progress="routeVisibleProgress"
          :video-dot="settings.videoDot"
          :flag-pop="flagPop"
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
        :bands="bands"
        :allow-sides="Boolean(settings.telemetry)"
        @drop-bands="emit('dropBands', $event)"
        @remove-band="removeBand"
      >
        <template #band="{ bandKey, side }">
          <ArtworkWidget
            v-if="settings.telemetry && widgetKind(bandKey)"
            :ref="(instance) => setWidgetRef(bandKey, instance)"
            :progress="liveProgress"
            :stat-progress="statProgress"
            :kind="widgetKind(bandKey)!"
            :side="side"
            :track="activity.track"
            :average-pace="activity.averagePaceSecondsPerKm"
            :telemetry="settings.telemetry"
            :color="settings.telemetry.color ?? settings.routeColor"
            :text-color="settings.textColor"
            :selected="selected === bandKey"
            @select="selectBand(bandKey)"
            @set-side="emit('setWidgetSide', widgetKind(bandKey)!, $event)"
          />
          <ArtworkElevation
            v-else-if="elevation && bandKey === 'elevation'"
            ref="elevationChart"
            :progress="liveProgress"
            :track="activity.track"
            :settings="elevation"
            :color="elevation.color ?? settings.routeColor"
            :text-color="settings.textColor"
            :selected="selected === 'elevation'"
            @select="selectBand('elevation')"
          />
        </template>
      </ArtworkStatsGrid>

      <!-- Трек двигается по всей области: от низа названия до низа карточки. -->
      <ArtworkRoute
        v-if="settings.routeVisible && !settings.map"
        ref="route"
        class="share-artwork__route"
        :track="activity.track"
        :color="settings.routeColor"
        :text-color="settings.textColor"
        :background-color="settings.backgroundColor"
        :route-style="settings.routeStyle"
        :scale="settings.routeScale"
        :position="settings.routePosition"
        :bearing="settings.routeBearing"
        :pitch="settings.routePitch"
        :km-markers="settings.routeFlags"
        :start-finish="settings.routeFlags"
        :selected="selected === 'route'"
        :slot-element="routeSlot"
        :progress="liveProgress"
        :video-dot="settings.videoDot"
        :flag-pop="flagPop"
        @select="selected = 'route'"
        @set-scale="emit('setRouteScale', $event)"
        @set-position="emit('setRoutePosition', $event)"
        @trash="removeRoute"
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

.share-artwork--twist {
  /* Два пальца по карточке — вращение карты или трека, а не масштаб страницы. */
  touch-action: pan-x pan-y;
}

.share-artwork--transparent {
  background: transparent;
}

.share-artwork__header {
  position: relative;
  z-index: 4;
  /*
   * Отступы названия (−8px) остаются внутри шапки, а не схлопываются с отступом тела.
   * html-to-image проставляет клону вычисленную высоту, а при явной высоте нижний отступ
   * не схлопывается — в PNG и кадрах видео тело (трек, показатели) съезжало на 8px вниз
   * относительно экрана, и точка видео висела рядом с треком (было).
   */
  display: flow-root;
}

/* Карта во весь фон — от края до края карточки. */
.share-artwork__map-full {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* Скругление своё: при переносе к корзине карточка не обрезает содержимое. */
  border-radius: inherit;
}

.share-artwork--dragging {
  overflow: visible;
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
  border-radius: inherit;
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
