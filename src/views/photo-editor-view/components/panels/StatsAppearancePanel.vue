<script setup lang="ts">
import { computed } from 'vue';
import type {
  ShareCardSettings,
  ShareStatStyle,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { DEFAULT_SHARE_STAT_WIDTH } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import { SHARE_STAT_STYLES } from '@/entities/activity/model/activity-share/activity-share-stat-styles';
import OptionTileRow from '@/views/photo-editor-view/components/settings/OptionTileRow.vue';
import ColorOptionTile from '@/views/photo-editor-view/components/settings/ColorOptionTile.vue';
import StatLayoutControls from '@/views/photo-editor-view/components/settings/StatLayoutControls.vue';
import StatStyleTile from '@/views/photo-editor-view/components/settings/StatStyleTile.vue';

const props = defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  setStatColumns: [width: ShareStatWidth];
  setStatSpacing: [value: number];
  setStatStyle: [style: ShareStatStyle];
  setTextColor: [color: string];
  removeAll: [];
}>();

const widths = computed(() =>
  props.settings.visibleStats.map(
    (key) => props.settings.statWidths[key] ?? DEFAULT_SHARE_STAT_WIDTH,
  ),
);
</script>

<template>
  <div class="stats-panel">
    <div class="stats-panel__controls">
      <StatLayoutControls
        class="stats-panel__layout"
        :widths="widths"
        :spacing="settings.statSpacing"
        @set-columns="emit('setStatColumns', $event)"
        @set-spacing="emit('setStatSpacing', $event)"
      />
      <!-- Убрать все показатели разом (отменяется стрелкой «назад»). -->
      <button
        type="button"
        class="stats-panel__remove-all"
        aria-label="Удалить все показатели"
        title="Удалить все показатели"
        @click="emit('removeAll')"
      >
        <v-icon icon="mdi-delete-sweep-outline" size="20" />
      </button>
    </div>

    <OptionTileRow>
      <template #fixed>
        <ColorOptionTile
          label="Цвет"
          input-label="Цвет текста показателей и названия"
          :color="settings.textColor"
          @change="emit('setTextColor', $event)"
        />
      </template>

      <StatStyleTile
        v-for="style in SHARE_STAT_STYLES"
        :key="style.id"
        :style-id="style.id"
        :name="style.name"
        :active="settings.statStyle === style.id"
        :settings="settings"
        @click="emit('setStatStyle', style.id)"
      />
    </OptionTileRow>
  </div>
</template>

<style scoped>
.stats-panel__controls {
  display: flex;
  gap: 8px;
}

/*
 * Узкий экран (iPhone SE): в одну строку не помещается — сверху сетка и «Удалить все»,
 * снизу плотность во всю ширину (иначе «Свободно» залезало под кнопку).
 */
@container stats-panel (max-width: 344px) {
  .stats-panel__controls {
    display: grid;
    grid-template-areas:
      'columns . remove'
      'density density density';
    grid-template-columns: auto 1fr auto;
  }

  .stats-panel__layout {
    display: contents;
  }

  .stats-panel__layout :deep(.stat-layout__group:first-child) {
    grid-area: columns;
  }

  .stats-panel__layout :deep(.stat-layout__group:last-child) {
    grid-area: density;
  }

  .stats-panel__remove-all {
    grid-area: remove;
  }
}

.stats-panel__layout {
  flex: 1 1 auto;
  min-width: 0;
}

.stats-panel__remove-all {
  display: grid;
  flex: 0 0 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  color: #f27474;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  container: stats-panel / inline-size;
  /* Сверху кнопки, а не плитки: тот же отступ от «ручки», что у ряда плиток (8px). */
  padding-top: 8px;
}
</style>
