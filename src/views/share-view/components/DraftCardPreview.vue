<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  ShareCardSettings,
  ShareStatKey,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';

/**
 * Превью черновика в карусели шаблонов: настоящая карточка, на которой пользователь
 * остановился, разложенная в ширину телефона и уменьшенная под плитку. Только просмотр.
 */
defineProps<{
  activity: IActivity;
  settings: ShareCardSettings;
  statValues: Record<ShareStatKey, string>;
}>();

/** Ширина раскладки карточки — как в редакторе на телефоне, чтобы превью совпало. */
const LAYOUT_WIDTH = 360;

const box = useTemplateRef<HTMLElement>('box');
const content = useTemplateRef<HTMLElement>('content');
const scale = ref(0);

useResizeObserver(
  () => [box.value, content.value],
  () => {
    const boxElement = box.value;
    const contentElement = content.value;
    if (!boxElement || !contentElement?.offsetHeight) return;
    scale.value = Math.min(
      boxElement.clientWidth / LAYOUT_WIDTH,
      boxElement.clientHeight / contentElement.offsetHeight,
    );
  },
);
</script>

<template>
  <div ref="box" class="draft-preview" inert aria-hidden="true">
    <div
      ref="content"
      class="draft-preview__content"
      :style="{
        width: `${LAYOUT_WIDTH}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        visibility: scale ? 'visible' : 'hidden',
      }"
    >
      <ShareCardArtwork
        :activity="activity"
        :settings="settings"
        :stat-values="statValues"
        exporting
      />
    </div>
  </div>
</template>

<style scoped>
.draft-preview {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--app-on-surface) 6%, var(--app-background));
  pointer-events: none;
}

.draft-preview__content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
}

/* Скругление и рамку даёт плитка карусели. */
.draft-preview :deep(.share-artwork) {
  border-radius: 0;
}
</style>
