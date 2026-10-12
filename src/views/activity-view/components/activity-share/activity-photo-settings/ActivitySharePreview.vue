<script setup lang="ts">
import { computed, ref } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type { PhotoTemplate } from './PhotoTemplateCarousel.vue';

const props = defineProps<{
  activity: IActivity;
  template: PhotoTemplate;
}>();

const emit = defineEmits<{
  back: [];
}>();

const saving = ref(false);
const sharing = ref(false);

const isTopographic = computed(() => props.template === 'topographic');

const routePoints = computed(() => {
  const track = props.activity.track;

  if (!track.length) return '';

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of track) {
    if (!Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
      continue;
    }

    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }

  if (![minLon, maxLon, minLat, maxLat].every(Number.isFinite)) {
    return '';
  }

  const midLat = (minLat + maxLat) / 2;
  const lonScale = Math.max(Math.cos((midLat * Math.PI) / 180), 0.01);

  const width = Math.max((maxLon - minLon) * lonScale, 1e-9);
  const height = Math.max(maxLat - minLat, 1e-9);
  const scale = 76 / Math.max(width, height);
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (100 - height * scale) / 2;

  return track
    .filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude))
    .map((p) => {
      const x = offsetX + (p.longitude - minLon) * lonScale * scale;
      const y = 100 - offsetY - (p.latitude - minLat) * scale;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
});

const distanceLabel = computed(() => `${(props.activity.distanceMeters / 1000).toFixed(2)} км`);

const durationLabel = computed(() => {
  const total = Math.max(0, Math.round(props.activity.durationSeconds));

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
});

const paceLabel = computed(() => {
  const pace = props.activity.averagePaceSecondsPerKm;

  if (!Number.isFinite(pace) || pace <= 0) return '—';

  const total = Math.round(pace);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /км`;
});

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function createPng(): Promise<Blob> {
  const background = isTopographic.value ? '#dce8d5' : '#17212b';
  const foreground = isTopographic.value ? '#254b38' : '#ffffff';
  const distance = escapeXml(distanceLabel.value);
  const duration = escapeXml(durationLabel.value);
  const pace = escapeXml(paceLabel.value);
  const name = escapeXml(props.activity.name || 'Моя тренировка');

  const route = routePoints.value
    ? `<polyline points="${routePoints.value}" fill="none"
         stroke="${foreground}" stroke-width="1.4"
         stroke-linecap="round" stroke-linejoin="round"/>`
    : '';

  const contour = isTopographic.value
    ? `<g fill="none" stroke="#78916e" stroke-width="0.25" opacity=".55">
         <path d="M0 80 Q25 40 50 70 T100 40"/>
         <path d="M0 88 Q25 48 50 78 T100 48"/>
         <path d="M0 96 Q25 56 50 86 T100 56"/>
         <path d="M0 20 Q25 0 50 25 T100 10"/>
       </g>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440"
      viewBox="0 0 100 133.333">
      <rect width="100" height="133.333" fill="${background}"/>
      ${contour}
      <g transform="translate(0 5)">${route}</g>
      <text x="7" y="104" fill="${foreground}" font-size="3.5"
        font-family="Arial, sans-serif" font-weight="600">${name}</text>
      <text x="7" y="114" fill="${foreground}" font-size="6"
        font-family="Arial, sans-serif" font-weight="700">${distance}</text>
      <text x="7" y="120" fill="${foreground}" font-size="2.8"
        font-family="Arial, sans-serif">${duration} · ${pace}</text>
      <text x="7" y="128" fill="${foreground}" opacity=".65"
        font-size="2" font-family="Arial, sans-serif">RUNVISION</text>
    </svg>`;

  const svgBlob = new Blob([svg], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Не удалось создать изображение'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas недоступен');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Не удалось сохранить изображение'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function saveImage() {
  saving.value = true;

  try {
    const blob = await createPng();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'runvision-workout.png';
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Ошибка сохранения изображения:', error);
  } finally {
    saving.value = false;
  }
}

async function shareImage() {
  sharing.value = true;

  try {
    const blob = await createPng();
    const file = new File([blob], 'runvision-workout.png', {
      type: 'image/png',
    });

    if (
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    ) {
      await navigator.share({
        title: 'Моя тренировка',
        text: `${distanceLabel.value} · ${durationLabel.value}`,
        files: [file],
      });
    } else {
      await saveImage();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    console.error('Ошибка отправки изображения:', error);
  } finally {
    sharing.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="true" fullscreen persistent transition="dialog-bottom-transition">
    <div class="preview-screen" :class="{ 'preview-screen--topographic': isTopographic }">
      <header class="preview-header">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          aria-label="Назад к настройкам"
          @click="emit('back')"
        />

        <div class="preview-heading">
          <strong>Предпросмотр</strong>
          <span>{{ activity.name || 'Моя тренировка' }}</span>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Закрыть предпросмотр"
          @click="emit('back')"
        />
      </header>

      <main class="preview-content">
        <div class="share-artwork">
          <svg
            v-if="routePoints"
            class="preview-route"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <polyline
              :points="routePoints"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <div v-else class="empty-route">
            <v-icon icon="mdi-map-marker-path" size="40" />
            <span>Нет данных маршрута</span>
          </div>

          <div class="artwork-stats">
            <div class="artwork-name">
              {{ activity.name || 'Моя тренировка' }}
            </div>
            <div class="artwork-distance">{{ distanceLabel }}</div>
            <div class="artwork-secondary">{{ durationLabel }} · {{ paceLabel }}</div>
            <div class="artwork-brand">RUNVISION</div>
          </div>
        </div>
      </main>

      <footer class="preview-actions">
        <v-btn variant="tonal" @click="emit('back')"> Назад </v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="saveImage">
          Сохранить
        </v-btn>
      </footer>
    </div>
  </v-dialog>
</template>

<style scoped>
.preview-screen {
  display: flex;
  width: 100%;
  height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  background: #101820;
  color: #fff;
}

.preview-screen--topographic {
  background: #e8eee3;
  color: #254b38;
}

.preview-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
}

.preview-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.preview-heading strong {
  font-size: 15px;
}

.preview-heading span {
  max-width: 55vw;
  overflow: hidden;
  font-size: 12px;
  opacity: 0.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-content {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
}

.share-artwork {
  position: relative;
  width: min(100%, 420px);
  max-height: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 14px;
  background: #17212b;
  color: #fff;
}

.preview-screen--topographic .share-artwork {
  background: #dce8d5;
  color: #254b38;
}

.preview-route {
  position: absolute;
  inset: 6%;
  width: 88%;
  height: 72%;
}

.artwork-stats {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 20px;
  background: rgb(0 0 0 / 30%);
}

.preview-screen--topographic .artwork-stats {
  background: rgb(255 255 255 / 75%);
}

.artwork-name {
  overflow-wrap: anywhere;
  font-size: 14px;
}

.artwork-distance {
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 800;
}

.artwork-secondary {
  font-size: 14px;
}

.artwork-brand {
  margin-top: 8px;
  font-size: 10px;
  letter-spacing: 2px;
  opacity: 0.7;
}

.empty-route {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0.7;
}

.preview-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 16px max(16px, env(safe-area-inset-bottom));
}

@media (max-width: 600px) {
  .preview-content {
    padding: 8px 16px;
  }

  .preview-actions > .v-btn {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
