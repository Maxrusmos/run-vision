<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardElement,
  ShareCardSettings,
  ShareColorKey,
  ShareRouteOffset,
  ShareRouteSize,
  ShareStat,
  ShareStatKey,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { getShareStatCardLabel } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import ArtworkBackground from '@/views/photo-editor-view/components/artwork/ArtworkBackground.vue';
import ArtworkHeader from '@/views/photo-editor-view/components/artwork/ArtworkHeader.vue';
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
  reorderStats: [keys: ShareStatKey[]];
  setStatWidth: [key: ShareStatKey, width: ShareStatWidth];
  setRouteSize: [size: ShareRouteSize];
  setRouteOffset: [offset: ShareRouteOffset];
  removeRoute: [];
}>();

const selected = defineModel<ShareCardElement | null>('selected', { default: null });

const rootElement = useTemplateRef<HTMLElement>('root');

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

const isRouteBehindStats = computed(
  () => props.settings.routeVisible && props.settings.routeBehindStats,
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
      'share-artwork--route-behind': isRouteBehindStats,
      'share-artwork--route-selected': selected === 'route',
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

    <ArtworkHeader
      class="share-artwork__header"
      :title="activity.name"
      :date="activity.startedAt"
      :text-color="settings.textColor"
      @change-text-color="emit('setColor', 'textColor', $event)"
    />

    <div class="share-artwork__body">
      <ArtworkRoute
        v-if="settings.routeVisible"
        class="share-artwork__route"
        :track="activity.track"
        :color="settings.routeColor"
        :size="settings.routeSize"
        :offset="settings.routeOffset"
        :selected="selected === 'route'"
        @select="selected = 'route'"
        @change-color="emit('setColor', 'routeColor', $event)"
        @set-size="emit('setRouteSize', $event)"
        @set-offset="emit('setRouteOffset', $event)"
        @remove="removeRoute"
      />

      <ArtworkStatsGrid
        v-model:selected="selected"
        class="share-artwork__stats"
        :stats="stats"
        :stat-widths="settings.statWidths"
        :show-borders="settings.showStatBorders"
        @reorder="emit('reorderStats', $event)"
        @remove="emit('removeStat', $event)"
        @set-width="(key, width) => emit('setStatWidth', key, width)"
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

  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  padding: clamp(16px, 4vw, 32px);
  overflow: hidden;
  border-radius: 16px;
  font-family: Inter, Arial, sans-serif;
  color: var(--share-text);
  background: var(--share-background);
}

.share-artwork--transparent {
  background: transparent;
}

.share-artwork__header,
.share-artwork__body {
  position: relative;
  z-index: 1;
}

/* Обычный режим: трек над показателями. */
.share-artwork__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--share-stat-gap);
  margin-top: 20px;
}

.share-artwork__route {
  margin: 0 -8px 12px;
}

/* Трек под показателями: оба слоя в одной ячейке, показатели прижаты к низу. */
.share-artwork--route-behind .share-artwork__route,
.share-artwork--route-behind .share-artwork__stats {
  grid-area: 1 / 1;
}

/* z-index: auto — без своего контекста наложения, чтобы пипетка трека
   (z-index внутри трека) оставалась над показателями. */
.share-artwork--route-behind .share-artwork__route {
  z-index: auto;
  align-self: center;
  margin-bottom: 0;
}

.share-artwork--route-behind .share-artwork__stats {
  z-index: 1;
  align-self: end;
}

/* Выделенный трек поднимаем над показателями, чтобы его можно было двигать. */
.share-artwork--route-behind.share-artwork--route-selected .share-artwork__route {
  z-index: 2;
}
</style>
