<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { toPng } from 'html-to-image';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import { useActivityShare } from '@/hooks/useActivityShare.ts';
import type {
  ShareStatKey,
  ShareStatOption,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';
import ShareCardArtwork from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardArtwork.vue';
import ShareColorSettings from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareColorSettings.vue';
import ShareCardStatAdd from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardStatAdd.vue';
import ShareCardResultDialog from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardResultDialog.vue';

const props = defineProps<{
  activity: IActivity;
  template: 'minimal' | 'topographic' | 'custom';
}>();

const emit = defineEmits<{
  back: [];
}>();

const { presets, settings, applyPreset, setColor, addStat, removeStat } = useActivityShare();

const statOptions: ShareStatOption[] = [
  { key: 'distance', label: 'Дистанция', shortLabel: 'км' },
  { key: 'duration', label: 'Время', shortLabel: 'мин' },
  { key: 'averagePace', label: 'Средний темп', shortLabel: 'мин/км' },
  { key: 'averageHeartRate', label: 'Средний пульс', shortLabel: 'уд/мин' },
  { key: 'maxHeartRate', label: 'Максимальный пульс', shortLabel: 'уд/мин' },
  { key: 'averageCadence', label: 'Каденс', shortLabel: 'шаг/мин' },
  { key: 'elevationGain', label: 'Набор высоты', shortLabel: 'метры' },
];

const visibleStats = computed(() => settings.value.visibleStats);
const canvasRef = ref<HTMLElement | null>(null);
const isSaving = ref(false);
const currentStep = ref<'edit' | 'result'>('edit');
const resultImage = ref('');

const isResultDialogOpen = computed({
  get: () => currentStep.value === 'result',
  set: (value) => {
    currentStep.value = value ? 'result' : 'edit';
  },
});

async function handleContinue() {
  const element = canvasRef.value?.querySelector<HTMLElement>('.artwork');
  if (!element || isSaving.value) return;
  isSaving.value = true;
  element.classList.add('artwork--exporting');

  try {
    await nextTick();
    resultImage.value = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: settings.value.backgroundColor,
    });
    currentStep.value = 'result';
  } catch (error) {
    console.error('Не удалось подготовить карточку:', error);
  } finally {
    element.classList.remove('artwork--exporting');
    isSaving.value = false;
  }
}

function handleAdd(key: ShareStatKey) {
  addStat(key);
}

function handleRemove(key: ShareStatKey) {
  removeStat(key);
}

function handleApplyPreset(id: string) {
  const preset = presets.find((item) => item.id === id);
  if (preset) {
    applyPreset(preset);
  }
}

function handleSetColor(key: 'backgroundColor' | 'routeColor' | 'textColor', value: string) {
  setColor(key, value);
}

async function handleSaveResult() {
  if (!resultImage.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const response = await fetch(resultImage.value);
    const blob = await response.blob();

    const fileName =
      props.activity.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim() || 'runvision-activity';

    const file = new File([blob], `${fileName}.png`, {
      type: 'image/png',
    });

    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: fileName,
      });

      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${fileName}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    console.error('Не удалось сохранить карточку:', error);
  } finally {
    isSaving.value = false;
  }
}

function handleReorderStats(keys: ShareStatKey[]) {
  settings.value.visibleStats = keys;
}
</script>

<template>
  <v-dialog
    fullscreen
    :model-value="true"
    content-class="share-preview-dialog"
    :scrim="true"
    persistent
  >
    <v-card class="share-preview">
      <v-divider />

      <div class="share-preview__body">
        <aside class="share-preview__sidebar">
          <ShareColorSettings
            :settings="settings"
            :presets="presets"
            :active-preset="settings.presetId"
            @apply-preset="handleApplyPreset"
            @set-color="handleSetColor"
          />
        </aside>

        <main class="share-preview__main">
          <div class="preview-heading">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Редактирование карточки</div>
              <div class="text-caption text-medium-emphasis">
                Настройте цвета, состав и порядок показателей
              </div>
            </div>

            <v-chip size="small" variant="tonal"> PNG </v-chip>
          </div>

          <div class="share-preview__stage">
            <div ref="canvasRef" class="share-preview__canvas">
              <ShareCardArtwork
                :activity="props.activity"
                :background-color="settings.backgroundColor"
                :route-color="settings.routeColor"
                :text-color="settings.textColor"
                :visible-stats="visibleStats"
                :stat-options="statOptions"
                @set-color="handleSetColor"
                @add-stat="handleAdd"
                @remove-stat="handleRemove"
                @reorder-stats="handleReorderStats"
              />
            </div>

            <ShareCardStatAdd
              :options="statOptions"
              :visible-stats="visibleStats"
              @add="handleAdd"
            />
          </div>
        </main>
      </div>

      <footer class="share-preview__footer">
        <v-btn variant="tonal" @click="emit('back')"> Отмена </v-btn>
        <v-btn color="primary" :loading="isSaving" :disabled="isSaving" @click="handleContinue">
          Продолжить
        </v-btn>
      </footer>
    </v-card>
  </v-dialog>
  <ShareCardResultDialog
    v-model="isResultDialogOpen"
    :image="resultImage"
    :loading="isSaving"
    @save="handleSaveResult"
  />
</template>

<style scoped>
.share-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--app-background);
}

.share-preview__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.share-preview__canvas {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: clamp(12px, 3vw, 36px);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background-color: var(--app-hover-bg);
}

.share-preview__stage > :deep(.share-card-stat-add) {
  align-self: center;
}

.share-preview__body {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.share-preview__sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border-right: 1px solid var(--app-border);
}

.share-preview__main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  padding: 24px;
}

.preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.share-preview__footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 76px;
  padding: 12px 24px;
  border-top: 1px solid var(--app-border);
  background: var(--app-background);
  box-shadow: 0 -4px 12px rgb(0 0 0 / 4%);
}

@media (max-width: 800px) {
  .share-preview__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .share-preview__sidebar {
    order: 2;
    border-top: 1px solid var(--app-border);
    border-right: 0;
  }

  .share-preview__main {
    order: 1;
    padding: 16px;
  }

  .share-preview__footer {
    padding: 12px 12px max(12px, env(safe-area-inset-bottom));
  }
}

@media (max-width: 480px) {
  .share-preview__footer {
    gap: 8px;
    padding: 12px 12px max(12px, env(safe-area-inset-bottom));
  }

  .share-preview__footer .v-btn {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
