<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareTelemetrySettings,
  ShareWidgetKind,
  ShareWidgetSide,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  ELEVATION_SERIES_SAMPLES,
  getElevationProfile,
} from '@/entities/activity/model/activity-share/activity-share-elevation';
import {
  getHeartRateSeries,
  getHeartRateZones,
  getPaceSeries,
  getSplits,
  normalizeSeries,
} from '@/entities/activity/model/activity-share/activity-share-telemetry';
import {
  SHARE_WIDGET_PLACEMENTS,
  findShareWidget,
} from '@/entities/activity/model/activity-share/activity-share-widgets';
import { ROUTE_LAYER_WIDTH } from '@/entities/activity/model/activity-share/activity-share-route';
import { formatPace } from '@/shared/lib/formatters/formatters';
import ArtworkElementToolbar from '@/views/photo-editor-view/components/artwork/ArtworkElementToolbar.vue';
import SelectionFrame from '@/views/photo-editor-view/components/artwork/SelectionFrame.vue';
import ProfileChart from '@/views/photo-editor-view/components/artwork/ProfileChart.vue';

/** Самый медленный сплит — не ниже этой доли высоты, иначе столбик пропадает. */
const SPLIT_FLOOR = 0.22;

const props = defineProps<{
  kind: ShareWidgetKind;
  track: ITrackPoint[];
  telemetry: ShareTelemetrySettings;
  color: string;
  textColor: string;
  selected: boolean;
  /** Превью в меню: без выделения и подписей. */
  preview?: boolean;
  /** Вертикальная «лента» у края области трека; без него — строка на всю ширину. */
  side?: ShareWidgetSide | null;
}>();

const emit = defineEmits<{
  select: [];
  remove: [];
  setSide: [side: ShareWidgetSide | null];
}>();

const vertical = computed(() => Boolean(props.side));

/** Положение по кругу: строкой → слева → справа (кнопка на панели выделенного виджета). */
const placement = computed({
  get: () => props.side ?? 'row',
  set: (value: 'row' | ShareWidgetSide) => emit('setSide', value === 'row' ? null : value),
});

const option = computed(() => findShareWidget(props.kind));

const pace = computed(() => (props.kind === 'pace' ? getPaceSeries(props.track) : null));
const heartRate = computed(() =>
  props.kind === 'heartRate' ? getHeartRateSeries(props.track) : null,
);
const elevation = computed(() =>
  props.kind === 'elevation' ? getElevationProfile(props.track, ELEVATION_SERIES_SAMPLES) : null,
);
const splits = computed(() => (props.kind === 'splits' ? getSplits(props.track) : []));
const zones = computed(() => (props.kind === 'zones' ? getHeartRateZones(props.track) : null));

/** Ряд для графика (0…1): у темпа быстрее — выше. */
const series = computed(() => {
  if (pace.value) return normalizeSeries(pace.value.values, true);
  if (heartRate.value) return normalizeSeries(heartRate.value.values);
  if (elevation.value) return elevation.value.values;
  return null;
});

const fastestSplit = computed(() =>
  splits.value.reduce<number | null>((best, split, index) => {
    if (split.length < 0.5) return best;
    return best === null || split.pace < splits.value[best]!.pace ? index : best;
  }, null),
);

/** Столбики сплитов: быстрее — выше. */
const splitBars = computed(() => {
  const paces = splits.value.map((split) => split.pace);
  if (!paces.length) return [];
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  return splits.value.map((split, index) => ({
    km: split.km,
    level: max > min ? SPLIT_FLOOR + (1 - SPLIT_FLOOR) * ((max - split.pace) / (max - min)) : 0.7,
    fastest: index === fastestSplit.value,
    partial: split.length < 0.999,
  }));
});

const hasData = computed(() => {
  if (props.kind === 'splits') return splits.value.length > 0;
  if (props.kind === 'zones') return zones.value !== null;
  return series.value !== null && series.value.length > 0;
});

/** Сводка в заголовке — короткая, как подпись прибора; в узкой колонке — одно число. */
const summary = computed(() => {
  if (!props.telemetry.labels || props.preview) return '';
  if (vertical.value) return compactSummary.value;
  if (pace.value) {
    return `ср. ${formatPace(pace.value.average)} · лучш. ${formatPace(pace.value.best)} /км`;
  }
  if (heartRate.value) {
    return `ср. ${Math.round(heartRate.value.average)} · макс. ${Math.round(heartRate.value.best)}`;
  }
  if (elevation.value && !elevation.value.flat) {
    const { min, max, gain } = elevation.value;
    return `${Math.round(min)}–${Math.round(max)} м · ↑${Math.round(gain)}`;
  }
  if (props.kind === 'splits' && fastestSplit.value !== null) {
    const split = splits.value[fastestSplit.value]!;
    return `лучш. ${split.km}-й км · ${formatPace(split.pace)}`;
  }
  if (zones.value) {
    const top = zones.value.reduce((best, zone) => (zone.share > best.share ? zone : best));
    return `больше всего Z${top.zone} · ${Math.round(top.share * 100)}%`;
  }
  return '';
});

const compactSummary = computed(() => {
  if (pace.value) return `${formatPace(pace.value.average)} /км`;
  if (heartRate.value) return `${Math.round(heartRate.value.average)} уд/мин`;
  if (elevation.value && !elevation.value.flat) return `↑ ${Math.round(elevation.value.gain)} м`;
  if (props.kind === 'splits' && fastestSplit.value !== null) {
    return `лучш. ${formatPace(splits.value[fastestSplit.value]!.pace)}`;
  }
  if (zones.value) {
    const top = zones.value.reduce((best, zone) => (zone.share > best.share ? zone : best));
    return `Z${top.zone} · ${Math.round(top.share * 100)}%`;
  }
  return '';
});

/**
 * Вертикальная «лента»: график рисуется в своих координатах (дистанция — по ширине),
 * затем поворачивается — дистанция сверху вниз, значение растёт от края карточки к центру.
 */
const tapeTransform = computed(() => {
  const { width } = box.value;
  return props.side === 'left' ? `matrix(0 1 -1 0 ${width} 0)` : 'matrix(0 1 1 0 0 0)';
});

// Размер области графика в пикселях раскладки (карточка масштабируется transform).
const body = useTemplateRef<HTMLElement>('body');
const box = ref({ width: 0, height: 0 });
const cardWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const element = body.value;
  if (!element) return;
  const measure = () => {
    box.value = { width: element.offsetWidth, height: element.offsetHeight };
    cardWidth.value = element.closest<HTMLElement>('.share-artwork')?.offsetWidth ?? 0;
  };
  measure();
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(element);
});

onBeforeUnmount(() => resizeObserver?.disconnect());

/** Единица слоя — от ширины всей карточки, как у трека. */
const unit = computed(() => (cardWidth.value || box.value.width + 32) / ROUTE_LAYER_WIDTH);

const splitGap = computed(() => (splitBars.value.length > 24 ? 1 : 3));
</script>

<template>
  <div
    class="artwork-widget"
    :class="[
      { 'artwork-widget--preview': preview, 'artwork-widget--vertical': vertical },
      side ? `artwork-widget--${side}` : null,
    ]"
    :data-selectable="preview ? undefined : ''"
    @click="!preview && emit('select')"
  >
    <SelectionFrame v-if="selected" />

    <div class="artwork-widget__header">
      <span class="artwork-widget__title">{{ option.title }}</span>
      <span v-if="summary" class="artwork-widget__summary">{{ summary }}</span>
    </div>

    <div ref="body" class="artwork-widget__body">
      <p v-if="!hasData" class="artwork-widget__empty">Нет данных в GPX</p>

      <svg
        v-else-if="series && box.width && box.height"
        :viewBox="`0 0 ${box.width} ${box.height}`"
        :width="box.width"
        :height="box.height"
        aria-hidden="true"
      >
        <g v-if="vertical" :transform="tapeTransform">
          <ProfileChart
            :series="series"
            :style-id="telemetry.chartStyle"
            :color="color"
            :accent-color="textColor"
            :width="box.height"
            :height="box.width"
            :unit="unit"
          />
        </g>
        <ProfileChart
          v-else
          :series="series"
          :style-id="telemetry.chartStyle"
          :color="color"
          :accent-color="textColor"
          :width="box.width"
          :height="box.height"
          :unit="unit"
        />
      </svg>

      <div
        v-else-if="kind === 'splits'"
        class="artwork-widget__splits"
        :style="{ gap: `${splitGap}px` }"
      >
        <span
          v-for="bar in splitBars"
          :key="bar.km"
          class="artwork-widget__split"
          :class="{
            'artwork-widget__split--fastest': bar.fastest,
            'artwork-widget__split--partial': bar.partial,
          }"
          :style="
            vertical
              ? { width: `${bar.level * 100}%`, background: color }
              : { height: `${bar.level * 100}%`, background: color }
          "
        />
      </div>

      <!-- В колонке зоны — столбиками Z1…Z5, доля — высотой. -->
      <div v-else-if="zones && vertical" class="artwork-widget__zone-columns">
        <div v-for="zone in zones" :key="zone.zone" class="artwork-widget__zone-column">
          <span class="artwork-widget__zone-value">{{ Math.round(zone.share * 100) }}</span>
          <span class="artwork-widget__zone-bar">
            <span
              :style="{
                height: `${Math.max(zone.share * 100, 2)}%`,
                background: color,
                opacity: 0.35 + zone.zone * 0.13,
              }"
            />
          </span>
          <span class="artwork-widget__zone-name">Z{{ zone.zone }}</span>
        </div>
      </div>

      <div v-else-if="zones" class="artwork-widget__zones">
        <div v-for="zone in [...zones].reverse()" :key="zone.zone" class="artwork-widget__zone">
          <span class="artwork-widget__zone-name">Z{{ zone.zone }}</span>
          <span class="artwork-widget__zone-track">
            <span
              class="artwork-widget__zone-fill"
              :style="{
                width: `${Math.max(zone.share * 100, 1.5)}%`,
                background: color,
                opacity: 0.35 + zone.zone * 0.13,
              }"
            />
          </span>
          <span class="artwork-widget__zone-share">{{ Math.round(zone.share * 100) }}%</span>
        </div>
      </div>
    </div>

    <ArtworkElementToolbar
      v-if="selected"
      v-model="placement"
      class="artwork-widget__toolbar export-hidden"
      :options="SHARE_WIDGET_PLACEMENTS"
      options-label="Положение виджета"
      remove-label="Удалить виджет"
      @remove="emit('remove')"
    />
  </div>
</template>

<style scoped>
.artwork-widget {
  position: relative;
  box-sizing: border-box;
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 4px;
  border-radius: 6px;
  pointer-events: auto;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.artwork-widget--preview {
  pointer-events: none;
}

/* Заголовок прибора: маркер, подпись капсом и сводка справа. */
.artwork-widget__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 3px;
  border-bottom: 1px solid color-mix(in srgb, var(--share-text) 18%, transparent);
  line-height: 1;
}

.artwork-widget__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0.75;
}

.artwork-widget__title::before {
  width: 5px;
  height: 5px;
  content: '';
  background: var(--share-route);
}

.artwork-widget__summary {
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artwork-widget__body {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
}

.artwork-widget__body svg {
  display: block;
}

.artwork-widget__empty {
  display: grid;
  height: 100%;
  margin: 0;
  place-items: center;
  font-size: 10px;
  opacity: 0.55;
}

.artwork-widget__splits {
  display: flex;
  height: 100%;
  align-items: flex-end;
  /* Линия-основание, как ось прибора. */
  border-bottom: 1px solid color-mix(in srgb, var(--share-text) 30%, transparent);
}

.artwork-widget__split {
  flex: 1 1 0;
  min-width: 1px;
  border-radius: 2px 2px 0 0;
  opacity: 0.45;
}

.artwork-widget__split--fastest {
  opacity: 1;
}

.artwork-widget__split--partial {
  opacity: 0.25;
}

.artwork-widget__zones {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
}

.artwork-widget__zone {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  gap: 6px;
  min-height: 0;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.artwork-widget__zone-name {
  width: 16px;
  font-weight: 700;
  opacity: 0.75;
}

.artwork-widget__zone-track {
  flex: 1 1 auto;
  height: 60%;
  max-height: 8px;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--share-text) 10%, transparent);
}

.artwork-widget__zone-fill {
  display: block;
  height: 100%;
}

.artwork-widget__zone-share {
  width: 28px;
  font-weight: 700;
  text-align: right;
}

/* Вертикальная «лента»: заголовок в две строки, полосы и шкала — от края карточки. */
.artwork-widget--vertical .artwork-widget__header {
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}

.artwork-widget--right .artwork-widget__header {
  align-items: flex-end;
  text-align: right;
}

.artwork-widget--vertical .artwork-widget__splits {
  flex-direction: column;
  align-items: flex-start;
  border-bottom: 0;
  border-left: 1px solid color-mix(in srgb, var(--share-text) 30%, transparent);
}

.artwork-widget--right .artwork-widget__splits {
  align-items: flex-end;
  border-right: 1px solid color-mix(in srgb, var(--share-text) 30%, transparent);
  border-left: 0;
}

.artwork-widget--vertical .artwork-widget__split {
  min-height: 1px;
  border-radius: 0 2px 2px 0;
}

.artwork-widget--right .artwork-widget__split {
  border-radius: 2px 0 0 2px;
}

.artwork-widget__zone-columns {
  display: flex;
  height: 100%;
  gap: 4px;
}

.artwork-widget__zone-column {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}

.artwork-widget__zone-value {
  font-weight: 700;
}

.artwork-widget__zone-bar {
  position: relative;
  display: flex;
  width: 100%;
  flex: 1 1 0;
  align-items: flex-end;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--share-text) 10%, transparent);
}

.artwork-widget__zone-bar > span {
  display: block;
  width: 100%;
}

.artwork-widget__zone-column .artwork-widget__zone-name {
  width: auto;
}

.artwork-widget__toolbar {
  position: absolute;
  z-index: 3;
  top: -12px;
  right: -6px;
}
</style>
