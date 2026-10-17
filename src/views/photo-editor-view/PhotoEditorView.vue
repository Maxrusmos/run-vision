<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave, useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import type { ShareCardElement } from '@/entities/activity/model/activity-share/activity-share.types';
import type { BandState } from '@/entities/activity/model/activity-share/activity-share-stat-layout';
import {
  SHARE_STAT_EMPTY_VALUE,
  getActivityShareStats,
} from '@/entities/activity/model/activity-share/activity-share-stats';
import { getPhotoTemplatePresetId } from '@/entities/activity/model/activity-share/photo-templates';
import {
  DEFAULT_VIDEO_DURATION,
  buildTrackTimeline,
  getActivityAtProgress,
  getRouteProgressAt,
  getStatProgress,
  type VideoDuration,
} from '@/entities/activity/model/activity-share/activity-share-video';
import type { ShareStatKey } from '@/entities/activity/model/activity-share/activity-share.types';
import { useShareVideoExport } from '@/hooks/useShareVideoExport';
import VideoPlaybackBar from '@/views/photo-editor-view/components/VideoPlaybackBar.vue';
import { useActivityStore } from '@/stores/activity.store';
import { useShareStore } from '@/stores/share.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { getLoadedDemoActivity } from '@/entities/activity/lib/demo-activity';
import { isSameTemplateSettings } from '@/entities/saved-template';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import TemplateEditBar from '@/views/photo-editor-view/components/TemplateEditBar.vue';
import TemplateLeaveDialog from '@/views/photo-editor-view/components/TemplateLeaveDialog.vue';
import { useShareCardSettings } from '@/hooks/useShareCardSettings';
import { useShareCardExport } from '@/hooks/useShareCardExport';
import { ROUTE_NAMES } from '@/router/routes';
import { delay, waitForNextPaint } from '@/shared/lib/dom/wait';
import { eventPathMatches } from '@/shared/lib/dom/event-path';
import FitToBox from '@/shared/ui/FitToBox.vue';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';
import EditorTopBar from '@/views/photo-editor-view/components/EditorTopBar.vue';
import FavoriteTemplateButton from '@/views/photo-editor-view/components/FavoriteTemplateButton.vue';
import { useAuthStore } from '@/stores/auth.store';
import ShareCardResultDialog from '@/views/photo-editor-view/components/ShareCardResultDialog.vue';
import EditorToolbar from '@/views/photo-editor-view/components/tools/EditorToolbar.vue';
import { dragTrash } from '@/hooks/useDragTrash';
import EditorTrashZone from '@/views/photo-editor-view/components/EditorTrashZone.vue';
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

/**
 * Один редактор на фото и видео: в видео под карточкой — воспроизведение (точка бежит
 * по треку, показатели растут ступеньками), а «Сохранить» делает MP4 вместо PNG.
 * Оформление (черновик шаблона) у фото и видео общее.
 */
const props = withDefaults(defineProps<{ mode?: 'photo' | 'video' }>(), { mode: 'photo' });
const isVideoMode = props.mode === 'video';

const router = useRouter();
const route = useRoute();
const activityStore = useActivityStore();
const { photoTemplateId, videoTemplateId } = storeToRefs(useShareStore());
const draftsStore = useShareDraftsStore();
const authStore = useAuthStore();
const savedTemplates = useSavedTemplatesStore();

// Режим шаблона (`?template=<id>`, из кабинета): правим сам сохранённый шаблон.
// «Сохранить» обновляет шаблон, картинку не делает; черновики карточек не трогаем.
// Шаблон и тренировку (свою или демо) заранее готовит роутер.
const editedTemplateId =
  !isVideoMode && typeof route.query.template === 'string' ? route.query.template : null;
const editedTemplateOnEnter = editedTemplateId ? savedTemplates.byId.get(editedTemplateId) : null;
const isTemplateMode = Boolean(editedTemplateOnEnter);
const editedTemplate = computed(
  () => (editedTemplateId && savedTemplates.byId.get(editedTemplateId)) || editedTemplateOnEnter,
);

/** Своя тренировка, а в режиме шаблона без неё — демо-пробежка. */
const activity = computed(
  () => activityStore.activity ?? (isTemplateMode ? getLoadedDemoActivity() : null),
);
const isDemoActivity = computed(() => isTemplateMode && !activityStore.activity);

// Основу фиксируем на входе: черновик пишется туда же, откуда взят.
const templateId =
  editedTemplateOnEnter?.baseTemplate ??
  (isVideoMode ? videoTemplateId.value : photoTemplateId.value);

const initialStatValues = activity.value ? getActivityShareStats(activity.value) : null;

const {
  settings,
  isDefault,
  applyPresetById,
  setColor,
  setBackgroundColor,
  addStat,
  addStats,
  removeStat,
  removeAllStats,
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
  setRouteBearing,
  setRoutePitch,
  setRouteKmMarkers,
  setRouteStartFinish,
  setRouteStyle,
  setRoutePosition,
  setTitle,
  setTitleVisible,
  resetSettings,
  setMapLayout,
  setMapStyle,
  setElevationVisible,
  setElevationStyle,
  setElevationSize,
  setElevationLabels,
  setElevationColor,
  setWidgetVisible,
  setWidgetSide,
  setBandPlacement,
  setTelemetrySize,
  setTelemetryChartStyle,
  setTelemetryColor,
  setTelemetryLabels,
  setBackgroundPattern,
  undo,
  redo,
  canUndo,
  canRedo,
} = useShareCardSettings(getPhotoTemplatePresetId(templateId), {
  template: templateId,
  // Шаблон из кабинета — или карточка, на которой остановились (в рамках сессии).
  initialSettings: editedTemplateOnEnter
    ? JSON.parse(JSON.stringify(editedTemplateOnEnter.settings))
    : draftsStore.getDraft(templateId),
  hasHeartRate: activity.value?.track.some((point) => (point.heartRate ?? 0) > 0) ?? false,
  hasElevation: activity.value?.hasElevation ?? false,
  // Показатели без данных («—») на новую карточку не ставим.
  isStatAvailable: (key) => initialStatValues?.[key] !== SHARE_STAT_EMPTY_VALUE,
});

// Черновик — на каждое изменение (настройки небольшие): уйдёшь в выбор стиля или
// перезагрузишь страницу — продолжишь с того же места. Как по шаблону — черновик не нужен.
function saveDraft() {
  if (isTemplateMode) return;
  draftsStore.saveDraft(templateId, isDefault() ? null : settings.value);
}
watch(settings, saveDraft, { deep: true });
onBeforeUnmount(saveDraft);

/** В режиме шаблона: карточка отличается от сохранённого шаблона. */
const isTemplateDirty = computed(
  () =>
    isTemplateMode &&
    editedTemplate.value !== null &&
    editedTemplate.value !== undefined &&
    !isSameTemplateSettings(editedTemplate.value.settings, settings.value),
);
const isSavingTemplate = ref(false);
const templateMessage = ref('');
const isTemplateMessageOpen = ref(false);

function showTemplateMessage(message: string) {
  templateMessage.value = message;
  isTemplateMessageOpen.value = true;
}

/** Сохранить изменения шаблона. true — сохранено. */
async function saveTemplate(): Promise<boolean> {
  if (!editedTemplateId || isSavingTemplate.value) return false;
  isSavingTemplate.value = true;
  try {
    await savedTemplates.update(editedTemplateId, { settings: settings.value });
    return true;
  } catch (error) {
    showTemplateMessage(isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE);
    return false;
  } finally {
    isSavingTemplate.value = false;
  }
}

async function handleSaveTemplate() {
  if (await saveTemplate()) showTemplateMessage('Шаблон сохранён');
}

// Уход из режима шаблона с несохранёнными изменениями — спрашиваем, что сделать
// (и по кнопке «назад», и по жесту «назад» в браузере).
const leaveTarget = ref<RouteLocationRaw | null>(null);
let isLeaveConfirmed = false;

onBeforeRouteLeave((to) => {
  if (!isTemplateDirty.value || isLeaveConfirmed) return true;
  leaveTarget.value = to.fullPath;
  return false;
});

function leave() {
  const target = leaveTarget.value;
  leaveTarget.value = null;
  isLeaveConfirmed = true;
  if (target) void router.push(target);
}

async function saveAndLeave() {
  if (await saveTemplate()) leave();
}

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
  // С картой в «Треке» ещё наклон и поворот карты — меню нужно и без трека.
  if (!settings.value.routeVisible && !settings.value.map) tools.push('track');
  if (!settings.value.elevation?.visible) tools.push('elevation');
  return tools;
});
watch(disabledTools, (tools) => {
  if (activeTool.value && tools.includes(activeTool.value)) activeTool.value = null;
});

/**
 * Панель «Добавить» на две строки (~56px каждая) ниже остальных — карточке остаётся
 * больше места; список внутри прокручивается.
 */
const ADD_PANEL_MAX_HEIGHT = 'calc(42dvh - 112px)';

// Тап по пустому месту вокруг карточки снимает выделение.
function handleCanvasClick(event: MouseEvent) {
  if (!eventPathMatches(event, '.share-artwork')) {
    selected.value = null;
  }
}

// Видео: время ролика, точка на треке и показатели «на момент». В покое — конец ролика:
// точка на финише, цифры итоговые (карточка как на фото).
const videoDuration = ref<VideoDuration>(DEFAULT_VIDEO_DURATION);
const videoTime = ref<number>(videoDuration.value);
const isPlaying = ref(false);
/** Во время записи видео показатели ставит экспорт — ступенька за ступенькой. */
const exportStatProgress = ref<number | null>(null);

const routeProgress = computed(() =>
  isVideoMode ? getRouteProgressAt(videoTime.value, videoDuration.value) : null,
);
const statProgress = computed(
  () => exportStatProgress.value ?? getStatProgress(routeProgress.value ?? 1, videoDuration.value),
);

const timeline = computed(() => (activity.value ? buildTrackTimeline(activity.value.track) : null));
// Ступенек немного (две в секунду ролика) — значения считаем один раз на ступеньку.
const statsCache = new Map<number, Record<ShareStatKey, string>>();
function getStatsAt(progress: number): Record<ShareStatKey, string> | null {
  if (!activity.value || !timeline.value) return null;
  let stats = statsCache.get(progress);
  if (!stats) {
    stats = getActivityShareStats(getActivityAtProgress(activity.value, timeline.value, progress));
    statsCache.set(progress, stats);
  }
  return stats;
}

const statValues = computed(() => {
  if (!activity.value) return null;
  return isVideoMode ? getStatsAt(statProgress.value) : getActivityShareStats(activity.value);
});

let playFrame = 0;
let lastFrameAt = 0;

function playTick(now: number) {
  const elapsed = (now - lastFrameAt) / 1000;
  lastFrameAt = now;
  videoTime.value = Math.min(videoDuration.value, videoTime.value + elapsed);
  if (videoTime.value >= videoDuration.value) {
    isPlaying.value = false;
    return;
  }
  playFrame = requestAnimationFrame(playTick);
}

function pause() {
  isPlaying.value = false;
  cancelAnimationFrame(playFrame);
}

function togglePlay() {
  if (isPlaying.value) {
    pause();
    return;
  }
  // Досмотрели до конца — запускаем сначала.
  if (videoTime.value >= videoDuration.value - 0.05) videoTime.value = 0;
  selected.value = null;
  isPlaying.value = true;
  lastFrameAt = performance.now();
  playFrame = requestAnimationFrame(playTick);
}

function seek(time: number) {
  pause();
  videoTime.value = Math.min(videoDuration.value, Math.max(0, time));
}

/** Другая длительность — точка остаётся в том же месте трека. */
function setVideoDuration(duration: VideoDuration) {
  const fraction = videoTime.value / videoDuration.value;
  videoDuration.value = duration;
  videoTime.value = fraction * duration;
}

onBeforeUnmount(pause);

const {
  isRendering: isVideoRendering,
  progress: videoRenderProgress,
  isSaving: isVideoSaving,
  video,
  render: renderVideo,
  save: saveVideoFile,
} = useShareVideoExport();

const isBusy = computed(() => isExporting.value || isRendering.value || isVideoRendering.value);

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

async function createVideo() {
  if (isBusy.value) return;

  pause();
  selected.value = null;
  isExporting.value = true;

  try {
    await delay(DESELECT_ANIMATION_MS);
    await nextTick();
    await waitForNextPaint();
    await artwork.value?.whenReady();

    const element = artwork.value?.getElement();
    if (!element) return;

    isResultOpen.value = await renderVideo({
      element,
      duration: videoDuration.value,
      showStatsAt: async (progress) => {
        exportStatProgress.value = progress;
        await nextTick();
        const values = settings.value.visibleStats.map((key) => statValues.value?.[key]);
        // Сплиты и зоны «Телеметрии» меняются вместе со ступенькой, даже если цифры те же.
        const hasStepWidgets = settings.value.telemetry?.widgets.some(
          (widget) => widget.kind === 'splits' || widget.kind === 'zones',
        );
        return [...values, hasStepWidgets ? progress : ''].join('|');
      },
      getMarks: (progress) => {
        const marks = artwork.value?.getVideoMarks(progress) ?? {
          dot: null,
          charts: [],
          flags: [],
        };
        return settings.value.routeVisible ? marks : { ...marks, dot: null };
      },
      dotColors: { route: settings.value.routeColor, ring: settings.value.textColor },
      flagColors: { text: settings.value.textColor, background: settings.value.backgroundColor },
      backgroundColor: settings.value.backgroundColor,
    });
  } finally {
    exportStatProgress.value = null;
    isExporting.value = false;
  }
}

function saveVideo() {
  if (activity.value) void saveVideoFile(activity.value.name);
}

function handleSave() {
  if (isTemplateMode) void handleSaveTemplate();
  else if (isVideoMode) void createVideo();
  else void createImage();
}

function saveImage() {
  if (activity.value) {
    save(activity.value.name);
  }
}

/** Перенос полосы (график, виджет): полосы и сдвинутые показатели — одним шагом истории. */
function dropBands(state: BandState) {
  setBandPlacement(state.rows, state.sides);
  setStatPositions(state.layout);
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
  // Режим шаблона: к последнему сохранённому виду шаблона, а не к стилю по умолчанию.
  resetSettings(isTemplateMode ? editedTemplate.value?.settings : undefined);
}

function goBack() {
  if (!isTemplateMode || !editedTemplateId) {
    router.push({ name: ROUTE_NAMES.share });
    return;
  }
  // Режим шаблона — назад к странице шаблона (откуда и пришли).
  const templatePage = router.resolve({
    name: ROUTE_NAMES.savedTemplate,
    params: { id: editedTemplateId },
  });
  if (window.history.state?.back === templatePage.fullPath) router.back();
  else void router.replace(templatePage);
}
</script>

<template>
  <div
    v-if="activity && statValues"
    class="photo-editor"
    :class="{ 'photo-editor--dragging': dragTrash.state.active }"
  >
    <EditorTopBar
      :can-undo="canUndo"
      :can-redo="canRedo"
      :saving="isTemplateMode ? isSavingTemplate : isBusy"
      :save-disabled="isTemplateMode && !isTemplateDirty"
      :save-label="isTemplateMode && !isTemplateDirty ? 'Сохранено' : 'Сохранить'"
      :reset-disabled="isTemplateMode && !isTemplateDirty"
      :reset-description="
        isTemplateMode
          ? 'Шаблон вернётся к последнему сохранённому виду. Сброс можно отменить стрелкой «назад».'
          : undefined
      "
      @back="goBack"
      @undo="handleUndo"
      @redo="handleRedo"
      @reset="handleReset"
      @save="handleSave"
    >
      <template #history-extra>
        <!-- «Избранное» — только для вошедших: шаблоны хранятся в аккаунте.
             В режиме шаблона не нужно: «Сохранить» и так сохраняет шаблон. -->
        <FavoriteTemplateButton
          v-if="authStore.isAuthenticated && !isTemplateMode"
          :template-id="templateId"
          :settings="settings"
        />
      </template>
    </EditorTopBar>

    <!-- Всегда видно, что правится шаблон, а не картинка тренировки. -->
    <TemplateEditBar
      v-if="isTemplateMode && editedTemplate"
      :name="editedTemplate.name"
      :dirty="isTemplateDirty"
      :demo="isDemoActivity"
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
        :progress="routeProgress"
        :stat-progress="isVideoMode ? statProgress : null"
        :video-time="isVideoMode ? videoTime : null"
        :video-duration="isVideoMode ? videoDuration : null"
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
        @drop-bands="dropBands"
        @remove-widget="setWidgetVisible($event, false)"
        @set-widget-side="setWidgetSide"
        @rotate-route="setRouteBearing"
      />
    </FitToBox>

    <VideoPlaybackBar
      v-if="isVideoMode"
      :time="videoTime"
      :duration="videoDuration"
      :playing="isPlaying"
      @toggle="togglePlay"
      @seek="seek"
      @set-duration="setVideoDuration"
    />

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
            @add-stats="addStats"
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
          />
          <WidgetsPanel
            v-else-if="displayedTool === 'widgets' && settings.telemetry"
            :telemetry="settings.telemetry"
            :route-color="settings.routeColor"
            :text-color="settings.textColor"
            :background-color="settings.backgroundColor"
            :track="activity.track"
            @set-size="setTelemetrySize"
            @set-chart-style="setTelemetryChartStyle"
            @set-color="setTelemetryColor"
            @set-labels="setTelemetryLabels"
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
            @set-pattern="setBackgroundPattern"
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
            @set-route-bearing="setRouteBearing"
            @set-route-pitch="setRoutePitch"
            @set-route-km-markers="setRouteKmMarkers"
            @set-route-start-finish="setRouteStartFinish"
          />
          <StatsAppearancePanel
            v-else-if="displayedTool === 'stats'"
            @remove-all="removeAllStats"
            :settings="settings"
            @set-stat-columns="setStatColumns"
            @set-stat-style="setStatStyle"
            @set-stat-spacing="setStatSpacing"
            @set-text-color="setColor('textColor', $event)"
          />
        </EditorToolPanel>
      </div>
    </Transition>

    <!-- Пока элемент тащат, панель закрывает корзина: бросили в неё — элемент удалён. -->
    <div class="photo-editor__bottom">
      <EditorToolbar v-model="activeTool" :tools="tools" :disabled-tools="disabledTools" />
      <EditorTrashZone />
    </div>
  </div>

  <TemplateLeaveDialog
    :model-value="leaveTarget !== null"
    :saving="isSavingTemplate"
    @update:model-value="leaveTarget = $event ? leaveTarget : null"
    @save="saveAndLeave"
    @discard="leave"
  />

  <v-snackbar
    v-model="isTemplateMessageOpen"
    timeout="2500"
    location="top"
    content-class="template-message"
  >
    {{ templateMessage }}
  </v-snackbar>

  <!-- Видео собирается кадр за кадром — показываем, сколько осталось. -->
  <v-dialog :model-value="isVideoRendering" persistent max-width="320">
    <v-card class="video-progress">
      <div class="video-progress__title">Создаём видео…</div>
      <v-progress-linear
        :model-value="videoRenderProgress * 100"
        color="primary"
        height="6"
        rounded
      />
      <div class="video-progress__value">{{ Math.round(videoRenderProgress * 100) }}%</div>
    </v-card>
  </v-dialog>

  <ShareCardResultDialog
    v-model="isResultOpen"
    :image="isVideoMode ? undefined : image"
    :video="isVideoMode ? video?.url : undefined"
    :loading="isVideoMode ? isVideoSaving : isSaving"
    @save="isVideoMode ? saveVideo() : saveImage()"
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

/* Элемент тащат к корзине: он виден за краем карточки и над корзиной. */
.photo-editor--dragging .photo-editor__canvas {
  z-index: 30;
  overflow: visible;
}

.photo-editor__bottom {
  position: relative;
  flex: 0 0 auto;
}

.video-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.video-progress__title {
  font-size: 17px;
  font-weight: 600;
}

.video-progress__value {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.photo-editor__canvas {
  flex: 1 1 0;
  background: color-mix(in srgb, var(--app-on-surface) 3%, var(--app-background));
}
</style>

<style>
/* Уведомление — под шапкой и полосой шаблона, а не поверх кнопок. */
.template-message {
  margin-top: calc(env(safe-area-inset-top) + 104px) !important;
}
</style>
