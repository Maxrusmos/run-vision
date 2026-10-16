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
}>();

const widths = computed(() =>
  props.settings.visibleStats.map(
    (key) => props.settings.statWidths[key] ?? DEFAULT_SHARE_STAT_WIDTH,
  ),
);
</script>

<template>
  <div class="stats-panel">
    <StatLayoutControls
      :widths="widths"
      :spacing="settings.statSpacing"
      @set-columns="emit('setStatColumns', $event)"
      @set-spacing="emit('setStatSpacing', $event)"
    />

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
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
