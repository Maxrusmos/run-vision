<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardElement,
  ShareCardSettings,
  ShareColorKey,
  ShareMapView,
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

/** Вписывание трека в карту во весь фон: сверху название, снизу показатели. */
const FULL_MAP_FIT_PADDING = { top: 0.2, right: 0.1, bottom: 0.42, left: 0.1 };
const BLOCK_MAP_FIT_PADDING = { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 };

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
  setMapView: [view: ShareMapView];
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

const rootElement = useTemplateRef<HTMLElement>('root');
const routeSlot = useTemplateRef<HTMLElement>('routeSlot');
const mapRef = useTemplateRef<InstanceType<typeof ArtworkMap>>('map');

/** С картой трек рисуется слоями самой карты — так он ложится на наклон и рельеф. */
/** Высота блока карты — до первой строки показателей; 0 — пока не измерено. */
const mapBlockHeight = ref(0);
const mapLayout = computed(() => props.settings.map?.layout ?? null);

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
      'share-artwork--exporting': exporting,
    }"
    :style="cssVariables"
    @click="handleClick"
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
        :fit-padding="FULL_MAP_FIT_PADDING"
        @set-view="emit('setMapView', $event)"
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
        v-if="settings.routeVisible || settings.map"
        ref="routeSlot"
        class="share-artwork__route-slot"
        :style="{ aspectRatio: 1 / ROUTE_SLOT_HEIGHT_RATIO }"
      />
      <!-- Карта отдельным блоком — на месте трека. -->
      <ArtworkMap
        v-if="settings.map && mapLayout === 'block'"
        ref="map"
        class="share-artwork__map-block"
        :style="
          mapBlockHeight
            ? { height: `${mapBlockHeight}px` }
            : { aspectRatio: 1 / ROUTE_SLOT_HEIGHT_RATIO }
        "
        :map="settings.map"
        :track="activity.track"
        :route-visible="settings.routeVisible"
        :route-style="settings.routeStyle"
        :route-color="settings.routeColor"
        :text-color="settings.textColor"
        :background-color="settings.backgroundColor"
        :fit-padding="BLOCK_MAP_FIT_PADDING"
        @set-view="emit('setMapView', $event)"
      />

      <!-- Показатели раскладываются по сетке на всей высоте — от названия до низа. -->
      <ArtworkStatsGrid
        v-model:selected="selected"
        :stats="stats"
        :stat-widths="settings.statWidths"
        :stat-positions="settings.statPositions"
        :reserved-height-ratio="settings.routeVisible || settings.map ? ROUTE_SLOT_HEIGHT_RATIO : 0"
        @remove="emit('removeStat', $event)"
        @set-width="(key, width) => emit('setStatWidth', key, width)"
        :stat-style="settings.statStyle"
        @set-layout="emit('setStatPositions', $event)"
        @reserved-height="mapBlockHeight = $event"
      />

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

.share-artwork__map-block {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 0;
  border-radius: 12px;
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
