<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import type { ShareCardElement } from '@/entities/activity/model/activity-share/activity-share.types';
import { getActivityShareStats } from '@/entities/activity/model/activity-share/activity-share-stats';
import { getPhotoTemplatePresetId } from '@/entities/activity/model/activity-share/photo-templates';
import { useActivityStore } from '@/stores/activity.store';
import { useShareStore } from '@/stores/share.store';
import { useShareCardSettings } from '@/hooks/useShareCardSettings';
import { useShareCardExport } from '@/hooks/useShareCardExport';
import { ROUTE_NAMES } from '@/router/routes';
import { delay, waitForNextPaint } from '@/shared/lib/dom/wait';
import StepPage from '@/shared/ui/StepPage.vue';
import PhotoEditorSidebar from '@/views/photo-editor-view/components/PhotoEditorSidebar.vue';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';
import AddElementButton from '@/views/photo-editor-view/components/AddElementButton.vue';
import EditorHistoryActions from '@/views/photo-editor-view/components/EditorHistoryActions.vue';
import ShareCardStatAdd from '@/views/photo-editor-view/components/ShareCardStatAdd.vue';
import ShareCardResultDialog from '@/views/photo-editor-view/components/ShareCardResultDialog.vue';

/** Время на анимацию снятия выделения с показателя перед рендером. */
const DESELECT_ANIMATION_MS = 160;

const router = useRouter();
const { activity } = storeToRefs(useActivityStore());
const { photoTemplateId } = storeToRefs(useShareStore());

const {
  settings,
  applyPresetById,
  setColor,
  addStat,
  removeStat,
  setStatPositions,
  setStatWidth,
  setStatSpacing,
  setShowStatBorders,
  setTransparentBackground,
  setBackgroundImage,
  removeBackgroundImage,
  setRouteVisible,
  setRouteScale,
  setRoutePosition,
  setTitle,
  setTitleVisible,
  resetSettings,
  undo,
  redo,
  canUndo,
  canRedo,
} = useShareCardSettings(getPhotoTemplatePresetId(photoTemplateId.value));

const { image, isRendering, isSaving, render, save } = useShareCardExport();

const artwork = useTemplateRef<InstanceType<typeof ShareCardArtwork>>('artwork');
const selected = ref<ShareCardElement | null>(null);
const isExporting = ref(false);
const isResultOpen = ref(false);

const statValues = computed(() => (activity.value ? getActivityShareStats(activity.value) : null));

const isBusy = computed(() => isExporting.value || isRendering.value);

async function createImage() {
  if (isBusy.value) return;

  selected.value = null;
  isExporting.value = true;

  try {
    await delay(DESELECT_ANIMATION_MS);
    await nextTick();
    await waitForNextPaint();

    const element = artwork.value?.getElement();
    if (!element) return;

    const isRendered = await render(element, {
      backgroundColor: settings.value.transparentBackground
        ? undefined
        : settings.value.backgroundColor,
    });

    isResultOpen.value = isRendered;
  } finally {
    isExporting.value = false;
  }
}

function saveImage() {
  if (activity.value) {
    save(activity.value.name);
  }
}

function handleUndo() {
  selected.value = null;
  undo();
}

function handleRedo() {
  selected.value = null;
  redo();
}

function handleReset() {
  selected.value = null;
  resetSettings();
}

function goBack() {
  router.push({ name: ROUTE_NAMES.share });
}
</script>

<template>
  <StepPage v-if="activity && statValues" max-width="1280px">
    <div class="photo-editor">
      <PhotoEditorSidebar
        class="photo-editor__sidebar"
        :settings="settings"
        @set-stat-spacing="setStatSpacing"
        @set-show-stat-borders="setShowStatBorders"
        @set-transparent-background="setTransparentBackground"
        @set-background-image="setBackgroundImage"
        @remove-background-image="removeBackgroundImage"
        @apply-preset="applyPresetById"
      />

      <section class="photo-editor__main">
        <div class="photo-editor__heading">
          <h2 class="photo-editor__title">Редактирование карточки</h2>
          <EditorHistoryActions
            :can-undo="canUndo"
            :can-redo="canRedo"
            @undo="handleUndo"
            @redo="handleRedo"
            @reset="handleReset"
          />
        </div>

        <div class="photo-editor__canvas">
          <ShareCardArtwork
            ref="artwork"
            v-model:selected="selected"
            :activity="activity"
            :settings="settings"
            :stat-values="statValues"
            :exporting="isExporting"
            @set-color="setColor"
            @remove-stat="removeStat"
            @set-stat-positions="setStatPositions"
            @set-stat-width="setStatWidth"
            @set-route-scale="setRouteScale"
            @set-route-position="setRoutePosition"
            @set-title="setTitle"
            @remove-title="setTitleVisible(false)"
            @remove-route="setRouteVisible(false)"
          />
        </div>

        <div class="photo-editor__add-actions">
          <AddElementButton
            v-if="!settings.titleVisible"
            label="Добавить название"
            icon="mdi-format-title"
            @click="setTitleVisible(true)"
          />
          <AddElementButton
            v-if="!settings.routeVisible"
            label="Добавить трек"
            icon="mdi-map-marker-path"
            @click="setRouteVisible(true)"
          />
          <ShareCardStatAdd
            :visible-stats="settings.visibleStats"
            :stat-values="statValues"
            @add="addStat"
          />
        </div>
      </section>
    </div>

    <template #footer>
      <v-btn variant="tonal" @click="goBack">Назад</v-btn>
      <v-btn color="primary" variant="flat" :loading="isBusy" @click="createImage">
        Продолжить
      </v-btn>
    </template>
  </StepPage>

  <ShareCardResultDialog
    v-model="isResultOpen"
    :image="image"
    :loading="isSaving"
    @save="saveImage"
  />
</template>

<style scoped>
.photo-editor {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}

.photo-editor__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.photo-editor__canvas {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: clamp(12px, 2vw, 36px);
  border-radius: 16px;
  background-color: var(--app-hover-bg);
}

.photo-editor__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-editor__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.photo-editor__add-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-editor__add-actions > * {
  flex: 1 1 200px;
}

@media (max-width: 800px) {
  .photo-editor {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .photo-editor__sidebar {
    order: 2;
  }

  .photo-editor__main {
    order: 1;
  }
}
</style>
