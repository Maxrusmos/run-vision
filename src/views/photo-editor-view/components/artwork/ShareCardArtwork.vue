<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
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
import ArtworkBackground from '@/views/photo-editor-view/components/artwork/ArtworkBackground.vue';
import ArtworkTitle from '@/views/photo-editor-view/components/artwork/ArtworkTitle.vue';
import ArtworkRoute from '@/views/photo-editor-view/components/artwork/ArtworkRoute.vue';
import ArtworkStatsGrid from '@/views/photo-editor-view/components/artwork/ArtworkStatsGrid.vue';

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
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

const rootElement = useTemplateRef<HTMLElement>('root');
const routeSlot = useTemplateRef<HTMLElement>('routeSlot');

const title = computed(() => props.settings.title ?? (props.activity.name || 'Тренировка'));

defineExpose({
  /** Корневой DOM-элемент карточки — его рендерим в PNG. */
  getElement: () => rootElement.value,
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
  if (!(event.target as Element).closest('[data-selectable]')) {
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
      'share-artwork--transparent': settings.transparentBackground,
      'share-artwork--exporting': exporting,
    }"
    :style="cssVariables"
    @click="handleClick"
  >
    <ArtworkBackground
      :color="settings.backgroundColor"
      :transparent="settings.transparentBackground"
      :image="settings.backgroundImage"
      :image-fit="settings.backgroundImageFit"
      :image-position="settings.backgroundImagePosition"
      @change-color="emit('setColor', 'backgroundColor', $event)"
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
        v-if="settings.routeVisible"
        ref="routeSlot"
        class="share-artwork__route-slot"
        :style="{ aspectRatio: 1 / ROUTE_SLOT_HEIGHT_RATIO }"
      />

      <!-- Показатели раскладываются по сетке на всей высоте — от названия до низа. -->
      <ArtworkStatsGrid
        v-model:selected="selected"
        :stats="stats"
        :stat-widths="settings.statWidths"
        :stat-positions="settings.statPositions"
        :show-borders="settings.showStatBorders"
        :reserved-height-ratio="settings.routeVisible ? ROUTE_SLOT_HEIGHT_RATIO : 0"
        @remove="emit('removeStat', $event)"
        @set-width="(key, width) => emit('setStatWidth', key, width)"
        :text-color="settings.textColor"
        @set-layout="emit('setStatPositions', $event)"
        @change-text-color="emit('setColor', 'textColor', $event)"
      />

      <!-- Трек двигается по всей области: от низа названия до низа карточки. -->
      <ArtworkRoute
        v-if="settings.routeVisible"
        class="share-artwork__route"
        :track="activity.track"
        :color="settings.routeColor"
        :scale="settings.routeScale"
        :position="settings.routePosition"
        :selected="selected === 'route'"
        :slot-element="routeSlot"
        @select="selected = 'route'"
        @change-color="emit('setColor', 'routeColor', $event)"
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
  --share-card-padding: clamp(16px, 4vw, 32px);
  --share-top-strip: 48px;

  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  /* Сверху — полоса под пипетку цвета фона, чтобы её ничто не перекрывало. */
  padding: var(--share-top-strip) var(--share-card-padding) var(--share-card-padding);
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
  padding-right: 8px;
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
