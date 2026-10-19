<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareRoutePitch,
  ShareRouteStyle,
  ShareVideoDotStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  VIDEO_DOT_STYLES,
  getVideoDotColor,
} from '@/entities/activity/model/activity-share/video-dot';
import {
  PRO_ROUTE_STYLES,
  SHARE_ROUTE_STYLES,
  findRouteStyle,
} from '@/entities/activity/model/activity-share/activity-share-route-styles';
import { SHARE_ROUTE_PITCHES } from '@/entities/activity/model/activity-share/activity-share-map';
import {
  orientRoute,
  projectRoute,
  toSvgPolylinePoints,
} from '@/entities/activity/lib/route-projection';
import SegmentedGroup from '@/views/photo-editor-view/components/settings/SegmentedGroup.vue';
import ToggleGroup from '@/views/photo-editor-view/components/settings/ToggleGroup.vue';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import ProTileBadge from '@/views/photo-editor-view/components/settings/ProTileBadge.vue';
import RouteStyleLayers from '@/views/photo-editor-view/components/artwork/RouteStyleLayers.vue';
import VideoDotMark from '@/views/photo-editor-view/components/artwork/VideoDotMark.vue';
import ColorResetDialog from '@/views/photo-editor-view/components/ColorResetDialog.vue';

/** Превью трека в плитке: размер области и масштаб эффектов. */
const PREVIEW = { width: 70, height: 46, padding: 9 };
/** Эффекты в превью крупнее пропорции карточки, иначе сдвиги копий не разглядеть. */
const PREVIEW_UNIT = 0.22;
/**
 * Точек трека в превью: плитка крошечная, а 16 плиток с полным треком (десятки тысяч
 * точек) перерисовывались на каждом шаге поворота — меню заметно подлагивало.
 */
const PREVIEW_POINTS = 200;
/** Превью точки: кусочек трека и точка в масштабе, при котором влезает «Неон». */
const DOT_PREVIEW_UNIT = 0.34;
const DOT_PREVIEW_PATH = 'M-40 14 C-24 12 -14 -2 0 0 S 22 -14 40 -10';

const props = defineProps<{
  settings: ShareCardSettings;
  track: ITrackPoint[];
  /** Видео: в ряду с наклоном и флажками — выбор, чьи плитки внизу: трека или точки. */
  video?: boolean;
  /** Стиль трека шаблона: на него переходит трек со своими цветами перед своим цветом. */
  templateRouteStyle: ShareRouteStyle;
}>();

const emit = defineEmits<{
  setRouteColor: [color: string];
  setRouteStyle: [style: ShareRouteStyle];
  setRouteBearing: [bearing: number];
  setRoutePitch: [pitch: ShareRoutePitch];
  setRouteFlags: [value: boolean];
  setVideoDotStyle: [style: ShareVideoDotStyle];
  /** null — цвет трека. */
  setVideoDotColor: [color: string | null];
  setVideoDotPhoto: [file: File];
  removeVideoDotPhoto: [];
}>();

/** Все стили трека: сначала обычные, за ними Pro (с короной на плитке). */
const routeStyles = [...SHARE_ROUTE_STYLES, ...PRO_ROUTE_STYLES];

/** Чьи плитки внизу (только видео); по умолчанию — трек. Наклон, флажки и поворот — всегда. */
const target = ref<'route' | 'dot'>('route');
const targetOptions = [
  { value: 'route' as const, label: 'Трек', title: 'Настройки трека' },
  { value: 'dot' as const, label: 'Точка', title: 'Точка, бегущая по треку' },
];

const dot = computed(() => props.settings.videoDot);

// Стиль со своими цветами («Радуга»): свой цвет трека его сбросит — сначала предупредить.
const colorTile = useTemplateRef<{ openPicker: () => void }>('colorTile');
const ownColorsStyle = computed(() => {
  const style = findRouteStyle(props.settings.routeStyle);
  return style.ownColors ? style : null;
});
const isColorResetOpen = ref(false);
const colorResetText = computed(
  () =>
    `«${ownColorsStyle.value?.name}» рисует трек своими цветами. Чтобы выбрать цвет, трек ` +
    `станет «${findRouteStyle(props.templateRouteStyle).name}» — стиль шаблона.`,
);

function confirmColorReset() {
  isColorResetOpen.value = false;
  emit('setRouteStyle', props.templateRouteStyle);
  colorTile.value?.openPicker();
}
const isDot = computed(() => props.video && target.value === 'dot');
const dotColor = computed(() => getVideoDotColor(dot.value, props.settings.routeColor));

function handleDotPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file?.type.startsWith('image/')) emit('setVideoDotPhoto', file);
}

/** Флажки на треке — одной кнопкой: отметки километров, старт и финиш. */
const flagOptions = computed(() => [
  {
    key: 'flags',
    icon: 'mdi-flag-checkered',
    title: props.settings.routeFlags ? 'Убрать флажки' : 'Флажки: километры и финиш',
    active: props.settings.routeFlags,
  },
]);

const pitch = computed({
  get: () => props.settings.routePitch,
  set: (value: ShareRoutePitch) => emit('setRoutePitch', value),
});
const pitchOptions = SHARE_ROUTE_PITCHES.map((value) => ({
  value,
  label: `${value}°`,
  title: value ? `Наклон ${value}°` : 'Без наклона',
}));

// Точки относительно центра превью — так же, как у трека на карточке (с поворотом и наклоном).
const flatPoints = computed(() => {
  const stride = Math.max(1, Math.floor(props.track.length / PREVIEW_POINTS));
  const sample = props.track.filter(
    (_, index) => index % stride === 0 || index === props.track.length - 1,
  );
  return projectRoute(sample, PREVIEW).map((point) => ({
    x: point.x - PREVIEW.width / 2,
    y: point.y - PREVIEW.height / 2,
  }));
});
const localPoints = computed(() =>
  orientRoute(
    flatPoints.value,
    { bearing: props.settings.routeBearing, pitch: props.settings.routePitch },
    PREVIEW,
  ),
);
const points = computed(() => toSvgPolylinePoints(localPoints.value));
const start = computed(() => localPoints.value[0] ?? null);
const viewBox = `${-PREVIEW.width / 2} ${-PREVIEW.height / 2} ${PREVIEW.width} ${PREVIEW.height}`;
</script>

<template>
  <div class="track-panel">
    <!-- Наклон, флажки и поворот — для всех шаблонов (с картой — заодно и карты), в видео —
         и при настройке точки. На карточке поворот — двумя пальцами. -->
    <div class="track-panel__controls">
      <SegmentedGroup
        v-if="video"
        v-model="target"
        :options="targetOptions"
        group-label="Что настраиваем"
      />
      <SegmentedGroup v-model="pitch" :options="pitchOptions" group-label="Наклон трека" grow />
      <ToggleGroup
        :options="flagOptions"
        group-label="Флажки на треке"
        @toggle="emit('setRouteFlags', !settings.routeFlags)"
      />
    </div>

    <!-- Поворот — такой же ползунок, как перемотка видео; края — по линии рядов выше и ниже. -->
    <div class="track-panel__rotation">
      <v-icon
        class="track-panel__rotation-icon"
        icon="mdi-rotate-3d-variant"
        size="20"
        aria-hidden="true"
      />
      <v-slider
        class="track-panel__range"
        :model-value="settings.routeBearing"
        :min="0"
        :max="355"
        :step="5"
        color="primary"
        track-color="rgb(var(--v-theme-on-surface))"
        thumb-size="14"
        track-size="4"
        hide-details
        density="compact"
        aria-label="Поворот трека"
        @update:model-value="emit('setRouteBearing', Number($event))"
      />
      <span class="track-panel__bearing">{{ settings.routeBearing }}°</span>
      <button
        type="button"
        class="track-panel__reset"
        :disabled="!settings.routeBearing"
        aria-label="Север сверху"
        title="Север сверху"
        @click="emit('setRouteBearing', 0)"
      >
        <v-icon
          icon="mdi-navigation-variant"
          size="20"
          :style="{ transform: `rotate(${-settings.routeBearing}deg)` }"
        />
      </button>
    </div>

    <!-- Один ряд на обе вкладки: плитка «Цвет» общая — у точки снизу выезжает «Цвет трека»
         (с анимацией), у трека прячется. Стили меняются, ряд центруется на выбранном. -->
    <OptionTileRow :center-key="target">
      <template #fixed>
        <ColorOptionTile
          ref="colorTile"
          label="Цвет"
          :input-label="isDot ? 'Цвет точки' : 'Цвет трека'"
          :color="isDot ? dotColor : settings.routeColor"
          :with-track-color="isDot"
          :track-color="!dot.color"
          :guarded="!isDot && Boolean(ownColorsStyle)"
          @guarded="isColorResetOpen = true"
          @change="isDot ? emit('setVideoDotColor', $event) : emit('setRouteColor', $event)"
          @use-track-color="emit('setVideoDotColor', null)"
        />
      </template>

      <!-- Точка видео: фото «пузырьком» и стили. Под фото стиль не виден — плитки
           неактивны (как цвет фона под фото в «Фоне»). -->
      <template v-if="isDot">
        <!-- Фото: тап — загрузить или заменить, крестик — удалить. -->
        <OptionTile tag="label" label="Фото" :active="Boolean(dot.photo)">
          <template #preview>
            <img v-if="dot.photo" class="track-panel__photo" :src="dot.photo" alt="" />
            <v-icon v-else icon="mdi-account-box-plus-outline" size="22" />
          </template>
          <input
            class="visually-hidden"
            type="file"
            accept="image/*"
            aria-label="Фото вместо точки"
            @change="handleDotPhotoChange"
          />
          <button
            v-if="dot.photo"
            type="button"
            class="track-panel__remove"
            aria-label="Убрать фото точки"
            @click.prevent.stop="emit('removeVideoDotPhoto')"
          >
            <v-icon icon="mdi-close" size="14" />
          </button>
        </OptionTile>

        <OptionTile
          v-for="style in VIDEO_DOT_STYLES"
          :key="style.id"
          :label="style.name"
          :active="!dot.photo && dot.style === style.id"
          :disabled="Boolean(dot.photo)"
          @click="emit('setVideoDotStyle', style.id)"
        >
          <template #preview>
            <svg
              class="track-preview"
              :viewBox="viewBox"
              :style="{ background: settings.backgroundColor }"
              aria-hidden="true"
            >
              <path
                :d="DOT_PREVIEW_PATH"
                fill="none"
                :stroke="settings.routeColor"
                stroke-width="3"
                stroke-linecap="round"
              />
              <VideoDotMark
                :x="0"
                :y="0"
                :route-color="dotColor"
                :ring-color="settings.textColor"
                :background-color="settings.backgroundColor"
                :unit="DOT_PREVIEW_UNIT"
                :dot="{ style: style.id, color: dot.color, photo: null }"
              />
            </svg>
          </template>
        </OptionTile>
      </template>

      <template v-else>
        <OptionTile
          v-for="style in routeStyles"
          :key="style.id"
          :label="style.name"
          :active="settings.routeStyle === style.id"
          @click="emit('setRouteStyle', style.id)"
        >
          <template #preview>
            <svg
              class="track-preview"
              :viewBox="viewBox"
              :style="{ background: settings.backgroundColor }"
              aria-hidden="true"
            >
              <RouteStyleLayers
                :points="points"
                :start="start"
                :style-id="style.id"
                :route-color="settings.routeColor"
                :text-color="settings.textColor"
                :background-color="settings.backgroundColor"
                :unit="PREVIEW_UNIT"
              />
            </svg>
            <ProTileBadge v-if="style.pro" />
          </template>
        </OptionTile>
      </template>
    </OptionTileRow>

    <ColorResetDialog
      v-model="isColorResetOpen"
      title="Цвета задаёт стиль трека"
      :text="colorResetText"
      @confirm="confirmColorReset"
    />
  </div>
</template>

<style scoped>
.track-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* Сверху кнопки, а не плитки: тот же отступ от «ручки», что у ряда плиток (8px). */
  padding-top: 8px;
}

.track-panel__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.track-panel__rotation {
  display: flex;
  align-items: center;
  gap: 10px;
  /* Высота — как у кнопок выше; между рядами — те же 12px (gap 4px + 8px). */
  height: 36px;
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
}

/* Иконка — по центру той же ширины, что и кнопка «Север сверху» справа: ряд симметричен. */
.track-panel__rotation-icon {
  flex: 0 0 40px;
}

.track-panel__range {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

/* Значение — по центру ячейки той же ширины, что у иконки слева: отступы от дорожки равны. */
.track-panel__bearing {
  flex: 0 0 40px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* Как кнопка флажков над ней: та же ширина и скругление, правые края на одной линии. */
.track-panel__reset {
  display: grid;
  flex: 0 0 40px;
  height: 36px;
  place-items: center;
  padding: 0;
  color: var(--app-primary);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.track-panel__reset:disabled {
  color: inherit;
  cursor: default;
  opacity: 0.4;
}

.track-panel__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-preview {
  display: block;
  width: 100%;
  height: 100%;
}
.track-panel__remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  padding: 0;
  color: #fff;
  border: 0;
  border-radius: 50%;
  background: #d94848;
  box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
  cursor: pointer;
}
</style>
