<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardElement,
  ShareCardSettings,
  ShareColorKey,
  ShareRoutePosition,
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
  setRoutePosition: [position: ShareRoutePosition];
  removeRoute: [];
  setTitle: [value: string];
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
      'share-artwork--route-behind': settings.routeBehindStats,
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
      :title="title"
      :date="activity.startedAt"
      :text-color="settings.textColor"
      :title-selected="selected === 'title'"
      @select-title="selected = 'title'"
      @change-title="emit('setTitle', $event)"
      @change-text-color="emit('setColor', 'textColor', $event)"
    />

    <div class="share-artwork__body">
      <!-- Место под трек в раскладке: задаёт его исходные положение и размер. -->
      <div v-if="settings.routeVisible" ref="routeSlot" class="share-artwork__route-slot" />

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

      <!-- Трек двигается по всей области: от низа названия до низа карточки. -->
      <ArtworkRoute
        v-if="settings.routeVisible"
        class="share-artwork__route"
        :track="activity.track"
        :color="settings.routeColor"
        :size="settings.routeSize"
        :position="settings.routePosition"
        :selected="selected === 'route'"
        :slot-element="routeSlot"
        @select="selected = 'route'"
        @change-color="emit('setColor', 'routeColor', $event)"
        @set-size="emit('setRouteSize', $event)"
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

/* Без z-index: тело не создаёт свой контекст наложения,
   поэтому выделенный трек может подняться над названием. */
.share-artwork__body {
  position: relative;
  padding-top: 16px;
}

.share-artwork__route-slot {
  aspect-ratio: 5 / 3;
  margin-bottom: 12px;
}

.share-artwork__stats {
  position: relative;
  z-index: 1;
}

/* Слой трека: от верха тела карточки (низ названия) до низа карточки, на всю ширину. */
.share-artwork__route {
  position: absolute;
  z-index: 2;
  top: 0;
  right: calc(-1 * var(--share-card-padding));
  bottom: calc(-1 * var(--share-card-padding));
  left: calc(-1 * var(--share-card-padding));
}

/* Трек под показателями. */
.share-artwork--route-behind .share-artwork__route {
  z-index: 0;
}

/* Выделенный трек всегда сверху (и над названием), чтобы его можно было двигать. */
.share-artwork--route-selected .share-artwork__route {
  z-index: 5;
}
</style>
