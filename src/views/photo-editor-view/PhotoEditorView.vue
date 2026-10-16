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
  MAP_EDITOR_TOOLS,
  TELEMETRY_EDITOR_TOOLS,
  type EditorToolId,
} from '@/views/photo-editor-view/components/tools/editor-tools';
import AddElementsPanel from '@/views/photo-editor-view/components/panels/AddElementsPanel.vue';
import WidgetsPanel from '@/views/photo-editor-view/components/panels/WidgetsPanel.vue';
import ElevationPanel from '@/views/photo-editor-view/components/panels/ElevationPanel.vue';
import MapPanel from '@/views/photo-editor-view/components/panels/MapPanel.vue';
import BackgroundPanel from '@/views/photo-editor-view/components/panels/BackgroundPanel.vue';
import PresetsPanel from '@/views/photo-editor-view/components/panels/PresetsPanel.vue';
import TrackPanel from '@/views/photo-editor-view/components/panels/TrackPanel.vue';
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
  setStatStyle,
  setStatColumns,
  setTransparentBackground,
  setBackgroundImage,
  removeBackgroundImage,
  setRouteVisible,
  setRouteScale,
  setRouteStyle,
  setRoutePosition,
  setTitle,
  setTitleVisible,
  resetSettings,
  setMapLayout,
  setMapStyle,
  setMapPitch,
  setElevationVisible,
  setElevationStyle,
  setElevationSize,
  setElevationLabels,
  setElevationColor,
  setWidgetVisible,
  setBandRows,
  setTelemetrySize,
  setTelemetryChartStyle,
  setTelemetryColor,
  setTelemetryLabels,
  setTelemetryGrid,
  setMapKmMarkers,
  setMapStartFinish,
  setMapBearing,
  undo,
  redo,
  canUndo,
  canRedo,
} = useShareCardSettings(getPhotoTemplatePresetId(photoTemplateId.value), {
  withMap: photoTemplateId.value === 'topographic',
  withTelemetry: photoTemplateId.value === 'telemetry',
  hasHeartRate: activity.value?.track.some((point) => (point.heartRate ?? 0) > 0) ?? false,
});

const tools = computed(() => {
  if (settings.value.map) return MAP_EDITOR_TOOLS;
  if (settings.value.telemetry) return TELEMETRY_EDITOR_TOOLS;
  return EDITOR_TOOLS;
});

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
  () => tools.value.find((tool) => tool.id === displayedTool.value)?.label ?? '',
);

// Нечего настраивать, если элемента нет на карточке: нет показателей или трека.
const disabledTools = computed<EditorToolId[]>(() => {
  const tools: EditorToolId[] = [];
  if (!settings.value.visibleStats.length) tools.push('stats');
  if (!settings.value.routeVisible) tools.push('track');
  if (!settings.value.elevation?.visible) tools.push('elevation');
  return tools;
});
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
    await artwork.value?.whenReady();

    const element = artwork.value?.getElement();
    if (!element) return;

    const isRendered = await render(element, {
      backgroundColor:
        settings.value.transparentBackground && !settings.value.map
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

/** Перенос полосы (график, виджет): строки полос и сдвинутые показатели — одним шагом истории. */
function moveBands(rows: Record<string, number>, layout: Parameters<typeof setStatPositions>[0]) {
  setBandRows(rows);
  setStatPositions(layout);
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
        @remove-elevation="setElevationVisible(false)"
        @move-bands="moveBands"
        @remove-widget="setWidgetVisible($event, false)"
        @rotate-map="setMapBearing"
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
            @add-elevation="setElevationVisible(true)"
            @add-widget="setWidgetVisible($event, true)"
          />
          <MapPanel
            v-else-if="displayedTool === 'map' && settings.map"
            :map="settings.map"
            :settings="settings"
            :track="activity.track"
            @set-layout="setMapLayout"
            @set-style="setMapStyle"
            @set-pitch="setMapPitch"
            @set-km-markers="setMapKmMarkers"
            @set-start-finish="setMapStartFinish"
            @set-bearing="setMapBearing"
          />
          <WidgetsPanel
            v-else-if="displayedTool === 'widgets' && settings.telemetry"
            :telemetry="settings.telemetry"
            :route-color="settings.routeColor"
            :text-color="settings.textColor"
            :background-color="settings.backgroundColor"
            :track="activity.track"
            @toggle-widget="(kind, visible) => setWidgetVisible(kind, visible)"
            @set-size="setTelemetrySize"
            @set-chart-style="setTelemetryChartStyle"
            @set-color="setTelemetryColor"
            @set-labels="setTelemetryLabels"
            @set-grid="setTelemetryGrid"
          />
          <ElevationPanel
            v-else-if="displayedTool === 'elevation' && settings.elevation"
            :elevation="settings.elevation"
            :route-color="settings.routeColor"
            :text-color="settings.textColor"
            :background-color="settings.backgroundColor"
            :track="activity.track"
            @set-style="setElevationStyle"
            @set-size="setElevationSize"
            @set-labels="setElevationLabels"
            @set-color="setElevationColor"
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
          <TrackPanel
            v-else-if="displayedTool === 'track'"
            :settings="settings"
            :track="activity.track"
            @set-route-color="setColor('routeColor', $event)"
            @set-route-style="setRouteStyle"
          />
          <StatsAppearancePanel
            v-else-if="displayedTool === 'stats'"
            :settings="settings"
            @set-stat-columns="setStatColumns"
            @set-stat-style="setStatStyle"
            @set-stat-spacing="setStatSpacing"
            @set-text-color="setColor('textColor', $event)"
          />
        </EditorToolPanel>
      </div>
    </Transition>

    <EditorToolbar v-model="activeTool" :tools="tools" :disabled-tools="disabledTools" />
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
