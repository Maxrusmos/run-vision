<script setup lang="ts">
import type {
  ShareCardSettings,
  ShareStatStyle,
} from '@/entities/activity/model/activity-share/activity-share.types';
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';
import ShareCardStatItem from '@/views/photo-editor-view/components/artwork/ShareCardStatItem.vue';

defineProps<{
  styleId: ShareStatStyle;
  name: string;
  active: boolean;
  settings: ShareCardSettings;
}>();
</script>

<template>
  <OptionTile :label="name" :active="active">
    <!-- Превью — настоящий показатель в цветах карточки. -->
    <template #preview>
      <span
        class="stat-style-preview"
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
          :stat-style="styleId"
          :selected="false"
          inert
          aria-hidden="true"
        />
      </span>
    </template>
  </OptionTile>
</template>

<style scoped>
.stat-style-preview {
  --share-stat-padding-y: 2px;
  --share-stat-padding-x: 5px;

  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 5px;
  font-family: Inter, Arial, sans-serif;
  pointer-events: none;
}

.stat-style-preview > :deep(.stat) {
  flex: 1 1 auto;
  border-radius: 7px;
}

.stat-style-preview :deep(.stat__label) {
  font-size: 8px;
}

.stat-style-preview :deep(.stat__value) {
  margin-top: 0;
  font-size: 14px;
}
</style>
