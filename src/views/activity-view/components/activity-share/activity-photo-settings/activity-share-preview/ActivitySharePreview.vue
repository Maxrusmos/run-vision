<script setup lang="ts">
import { computed, ref } from 'vue';
import { toPng } from 'html-to-image';

import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import { useActivityShare } from '@/hooks/useActivityShare.ts';
import type {
  ShareStatKey,
  ShareStatOption,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';

import ShareCardArtwork from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardArtwork.vue';
import ShareStatsSettings from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareStatsSettings.vue';
import ShareColorSettings from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareColorSettings.vue';

const props = defineProps<{
  activity: IActivity;
  template: 'minimal' | 'topographic' | 'custom';
}>();

const emit = defineEmits<{
  back: [];
}>();

const { presets, settings, applyPreset, setColor, addStat, removeStat, moveStat } =
  useActivityShare();

const statOptions: ShareStatOption[] = [
  { key: 'distance', label: 'Дистанция', shortLabel: 'км' },
  { key: 'duration', label: 'Время', shortLabel: 'длительность' },
  { key: 'averagePace', label: 'Средний темп', shortLabel: 'мин/км' },
  { key: 'averageHeartRate', label: 'Средний пульс', shortLabel: 'уд/мин' },
  { key: 'maxHeartRate', label: 'Максимальный пульс', shortLabel: 'уд/мин' },
  { key: 'averageCadence', label: 'Каденс', shortLabel: 'шаг/мин' },
  { key: 'elevationGain', label: 'Набор высоты', shortLabel: 'метры' },
];

const visibleStats = computed(() => settings.value.visibleStats);

const canvasRef = ref<HTMLElement | null>(null);
const isSaving = ref(false);

function handleAdd(key: ShareStatKey) {
  addStat(key);
}

function handleRemove(key: ShareStatKey) {
  removeStat(key);
}

function handleMove(key: ShareStatKey, direction: -1 | 1) {
  const index = settings.value.visibleStats.indexOf(key);

  if (index !== -1) {
    moveStat(index, direction);
  }
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

async function handleSave() {
  const element = canvasRef.value?.querySelector<HTMLElement>('.artwork');

  if (!element || isSaving.value) return;

  isSaving.value = true;

  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: settings.value.backgroundColor,
    });

    const link = document.createElement('a');
    const fileName =
      props.activity.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim() || 'runvision-activity';

    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Не удалось сохранить карточку:', error);
  } finally {
    isSaving.value = false;
  }
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

          <ShareStatsSettings
            :visible-stats="visibleStats"
            :options="statOptions"
            @add="handleAdd"
            @remove="handleRemove"
            @move="handleMove"
          />
        </aside>

        <main class="share-preview__main">
          <div class="preview-heading">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Предпросмотр</div>
              <div class="text-caption text-medium-emphasis">Так будет выглядеть изображение</div>
            </div>

            <v-chip size="small" variant="tonal" prepend-icon="mdi-image-outline"> PNG </v-chip>
          </div>

          <div ref="canvasRef" class="share-preview__canvas">
            <ShareCardArtwork
              :activity="props.activity"
              :background-color="settings.backgroundColor"
              :route-color="settings.routeColor"
              :text-color="settings.textColor"
              :visible-stats="visibleStats"
            />
          </div>

          <div class="preview-hint">
            <v-icon icon="mdi-information-outline" size="small" />
            <span>
              Изменения отображаются сразу. Для лучшего результата оставь 3–5 основных показателей.
            </span>
          </div>
        </main>
      </div>

      <footer class="share-preview__footer">
        <v-btn variant="tonal" @click="emit('back')"> Отмена </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="isSaving"
          :disabled="isSaving"
          @click="handleSave"
        >
          Сохранить
        </v-btn>
      </footer>
    </v-card>
  </v-dialog>
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

.share-preview__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 16px;
  min-height: 80px;
  padding: 12px 24px;
}

.share-preview__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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

.share-preview__canvas {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  min-height: 300px;
  padding: clamp(12px, 3vw, 36px);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background-color: var(--app-hover-bg);
}

.preview-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 600px;
  margin-inline: auto;
  color: var(--app-on-surface);
  font-size: 12px;
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

  .share-preview__header {
    min-height: 68px;
    padding: 10px 12px;
  }

  .share-preview__footer {
    padding: 12px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
}

@media (max-width: 480px) {
  .share-preview__footer {
    gap: 8px;
  }

  .share-preview__footer .v-btn {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
