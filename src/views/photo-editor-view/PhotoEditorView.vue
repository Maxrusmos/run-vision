<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
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
import { eventPathMatches } from '@/shared/lib/dom/event-path';
import FitToBox from '@/shared/ui/FitToBox.vue';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';
import EditorTopBar from '@/views/photo-editor-view/components/EditorTopBar.vue';
import ShareCardResultDialog from '@/views/photo-editor-view/components/ShareCardResultDialog.vue';
import EditorToolbar from '@/views/photo-editor-view/components/tools/EditorToolbar.vue';
import EditorToolPanel from '@/views/photo-editor-view/components/tools/EditorToolPanel.vue';
import {
  EDITOR_TOOLS,
  type EditorToolId,
} from '@/views/photo-editor-view/components/tools/editor-tools';
import AddElementsPanel from '@/views/photo-editor-view/components/panels/AddElementsPanel.vue';
import BackgroundPanel from '@/views/photo-editor-view/components/panels/BackgroundPanel.vue';
import PresetsPanel from '@/views/photo-editor-view/components/panels/PresetsPanel.vue';
import StatsAppearancePanel from '@/views/photo-editor-view/components/panels/StatsAppearancePanel.vue';

/** Время на анимацию снятия выделения с показателя перед рендером. */
const DESELECT_ANIMATION_MS = 160;

const router = useRouter();
const { activity } = storeToRefs(useActivityStore());
const { photoTemplateId } = storeToRefs(useShareStore());

const {
  settings,
  applyPresetById,
  setColor,
  setBackgroundColor,
  addStat,
  removeStat,
  setStatPositions,
  setStatWidth,
  setStatSpacing,
  setShowStatBorders,
  setStatStyle,
  setStatColumns,
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
const activeTool = ref<EditorToolId | null>(null);

// Инструмент, чья панель показана. Не сбрасывается при закрытии, чтобы панель
// доиграла анимацию закрытия со своим содержимым.
const displayedTool = ref<EditorToolId | null>(null);
watch(activeTool, (tool) => {
  if (tool) displayedTool.value = tool;
});

const displayedToolTitle = computed(
  () => EDITOR_TOOLS.find((tool) => tool.id === displayedTool.value)?.label ?? '',
);

// Без показателей настраивать их внешний вид нечего.
const disabledTools = computed<EditorToolId[]>(() =>
  settings.value.visibleStats.length ? [] : ['stats'],
);
watch(disabledTools, (tools) => {
  if (activeTool.value && tools.includes(activeTool.value)) activeTool.value = null;
});

/** Панель «Добавить» на строку ниже остальных — карточке остаётся больше места. */
const ADD_PANEL_MAX_HEIGHT = 'calc(42dvh - 56px)';

// Тап по пустому месту вокруг карточки снимает выделение.
function handleCanvasClick(event: MouseEvent) {
  if (!eventPathMatches(event, '.share-artwork')) {
    selected.value = null;
  }
}

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
  <div v-if="activity && statValues" class="photo-editor">
    <EditorTopBar
      :can-undo="canUndo"
      :can-redo="canRedo"
      :saving="isBusy"
      @back="goBack"
      @undo="handleUndo"
      @redo="handleRedo"
      @reset="handleReset"
      @save="createImage"
    />

    <!-- Карточка всегда видна целиком: уменьшается под свободное место. -->
    <FitToBox class="photo-editor__canvas" @click="handleCanvasClick">
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
        @remove-route="setRouteVisible(false)"
        @set-title="setTitle"
        @remove-title="setTitleVisible(false)"
      />
    </FitToBox>

    <!-- Панель выезжает, только когда открывается из закрытого состояния;
         при переключении между инструментами она остаётся на месте. -->
    <Transition name="tool-panel">
      <div v-if="activeTool" class="photo-editor__panel">
        <EditorToolPanel
          :title="displayedToolTitle"
          :max-height="displayedTool === 'add' ? ADD_PANEL_MAX_HEIGHT : undefined"
          @close="activeTool = null"
        >
          <AddElementsPanel
            v-if="displayedTool === 'add'"
            :settings="settings"
            :stat-values="statValues"
            @add-title="setTitleVisible(true)"
            @add-route="setRouteVisible(true)"
            @add-stat="addStat"
          />
          <BackgroundPanel
            v-else-if="displayedTool === 'background'"
            :settings="settings"
            @set-background-color="setBackgroundColor"
            @set-transparent-background="setTransparentBackground"
            @set-background-image="setBackgroundImage"
            @remove-background-image="removeBackgroundImage"
          />
          <PresetsPanel
            v-else-if="displayedTool === 'presets'"
            :settings="settings"
            @apply-preset="applyPresetById"
          />
          <StatsAppearancePanel
            v-else-if="displayedTool === 'stats'"
            :settings="settings"
            @set-stat-columns="setStatColumns"
            @set-stat-style="setStatStyle"
            @set-stat-spacing="setStatSpacing"
            @set-show-stat-borders="setShowStatBorders"
          />
        </EditorToolPanel>
      </div>
    </Transition>

    <EditorToolbar v-model="activeTool" :tools="EDITOR_TOOLS" :disabled-tools="disabledTools" />
  </div>

  <ShareCardResultDialog
    v-model="isResultOpen"
    :image="image"
    :loading="isSaving"
    @save="saveImage"
  />
</template>

<style scoped>
.photo-editor {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  background: var(--app-background);
}

.photo-editor__panel {
  display: grid;
  grid-template-rows: 1fr;
  min-height: 0;
}

.photo-editor__panel > * {
  min-height: 0;
  overflow: hidden;
}

/* Высота анимируется через grid-template-rows: 0fr → 1fr, карточка плавно ужимается. */
.tool-panel-enter-active,
.tool-panel-leave-active {
  transition:
    grid-template-rows 240ms cubic-bezier(0.2, 0, 0, 1),
    opacity 200ms ease;
}

.tool-panel-enter-from,
.tool-panel-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tool-panel-enter-active,
  .tool-panel-leave-active {
    transition: none;
  }
}

.photo-editor__canvas {
  flex: 1 1 0;
  background: color-mix(in srgb, var(--app-on-surface) 3%, var(--app-background));
}
</style>
