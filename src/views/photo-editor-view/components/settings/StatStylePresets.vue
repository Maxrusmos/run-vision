<script setup lang="ts">
import type {
  ShareCardSettings,
  ShareStatStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { SHARE_STAT_STYLES } from '@/entities/activity/model/activity-share/activity-share-stat-styles';
import ShareCardStatItem from '@/views/photo-editor-view/components/artwork/ShareCardStatItem.vue';

defineProps<{
  settings: ShareCardSettings;
}>();

const emit = defineEmits<{
  select: [style: ShareStatStyle];
}>();
</script>

<template>
  <!-- Превью — настоящий показатель в цветах карточки, поэтому видно, как будет на ней. -->
  <div class="stat-styles">
    <button
      v-for="style in SHARE_STAT_STYLES"
      :key="style.id"
      type="button"
      class="stat-styles__item"
      :class="{ 'stat-styles__item--active': settings.statStyle === style.id }"
      :aria-pressed="settings.statStyle === style.id"
      @click="emit('select', style.id)"
    >
      <span
        class="stat-styles__preview"
        :style="{
          '--share-text': settings.textColor,
          '--share-route': settings.routeColor,
          '--share-background': settings.backgroundColor,
          color: settings.textColor,
          background: settings.backgroundColor,
        }"
      >
        <ShareCardStatItem
          label="Темп"
          value="7:00"
          width="full"
          :stat-style="style.id"
          :show-border="settings.showStatBorders"
          :selected="false"
          :text-color="settings.textColor"
          inert
          aria-hidden="true"
        />
      </span>
      <span class="stat-styles__name">{{ style.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.stat-styles {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 2px 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.stat-styles::-webkit-scrollbar {
  display: none;
}

.stat-styles__item {
  display: flex;
  flex: 0 0 104px;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  color: inherit;
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}

.stat-styles__item--active {
  border-color: var(--app-primary);
  background: var(--app-primary-bg);
}

.stat-styles__preview {
  display: block;
  padding: 8px;
  overflow: hidden;
  border-radius: 8px;
  font-family: Inter, Arial, sans-serif;
  pointer-events: none;
  --share-stat-padding-y: 4px;
  --share-stat-padding-x: 6px;
}

.stat-styles__preview :deep(.stat__value) {
  font-size: 18px;
}

.stat-styles__name {
  font-size: 12px;
  font-weight: 500;
}
</style>
