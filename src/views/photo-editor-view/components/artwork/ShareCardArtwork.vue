<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareColorKey,
  ShareStat,
  ShareStatKey,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { getShareStatCardLabel } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import ArtworkBackground from '@/views/photo-editor-view/components/artwork/ArtworkBackground.vue';
import ArtworkHeader from '@/views/photo-editor-view/components/artwork/ArtworkHeader.vue';
import ArtworkRoute from '@/views/photo-editor-view/components/artwork/ArtworkRoute.vue';
import ArtworkStatsGrid from '@/views/photo-editor-view/components/artwork/ArtworkStatsGrid.vue';

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
}>();

const selectedStat = defineModel<ShareStatKey | null>('selectedStat', { default: null });

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

const cssVariables = computed(() => ({
  '--share-background': props.settings.backgroundColor,
  '--share-route': props.settings.routeColor,
  '--share-text': props.settings.textColor,
  '--share-stat-spacing': `${props.settings.statSpacing}px`,
  '--share-stat-padding-y': `${1 + props.settings.statSpacing * 0.35}px`,
  '--share-stat-padding-x': `${4 + props.settings.statSpacing / 3}px`,
}));
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
      :title="activity.name"
      :date="activity.startedAt"
      :text-color="settings.textColor"
      @change-text-color="emit('setColor', 'textColor', $event)"
    />

    <ArtworkRoute
      :track="activity.track"
      :color="settings.routeColor"
      @change-color="emit('setColor', 'routeColor', $event)"
    />

    <ArtworkStatsGrid
      v-model:selected="selectedStat"
      :stats="stats"
      :stat-widths="settings.statWidths"
      :show-borders="settings.showStatBorders"
      @reorder="emit('reorderStats', $event)"
      @remove="emit('removeStat', $event)"
      @set-width="(key, width) => emit('setStatWidth', key, width)"
    />
  </div>
</template>

<style scoped>
.share-artwork {
  --share-background: #111827;
  --share-route: #fff;
  --share-text: #fff;
  --share-stat-spacing: 12px;
  --share-stat-padding-y: 6px;

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
</style>
