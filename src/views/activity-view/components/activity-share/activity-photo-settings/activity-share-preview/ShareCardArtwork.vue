<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CSSProperties } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import type {
  ShareStatKey,
  ShareStatOption,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';
import { getActivityShareStat } from '@/entities/activity/model/activity-share/activity-share-stats.ts';
import ShareCardColorEditor from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardColorEditor.vue';
import Draggable from 'vuedraggable';
import ShareCardStatItem from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ShareCardStatItem.vue';

const props = defineProps<{
  activity: IActivity;
  backgroundColor: string;
  routeColor: string;
  textColor: string;
  visibleStats: ShareStatKey[];
  statOptions: ShareStatOption[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  transparentBackground: boolean;
}>();

const emit = defineEmits<{
  setColor: [key: 'backgroundColor' | 'routeColor' | 'textColor', color: string];
  removeStat: [key: ShareStatKey];
  addStat: [key: ShareStatKey];
  reorderStats: [keys: ShareStatKey[]];
  setStatWidth: [key: ShareStatKey, width: ShareStatWidth];
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const isDraggingStats = ref(false);

defineExpose({ svgRef });

type DraggableStat = {
  key: ShareStatKey;
  label: string;
  value: string;
};

const routePoints = computed(() => {
  const track = props.activity.track;

  if (track.length === 0) return '';

  const longitudes = track.map((point) => point.longitude);
  const latitudes = track.map((point) => point.latitude);

  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  const width = 600;
  const height = 300;
  const padding = 30;

  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  const scale = Math.min((width - padding * 2) / lonRange, (height - padding * 2) / latRange);

  const routeWidth = lonRange * scale;
  const routeHeight = latRange * scale;

  const offsetX = (width - routeWidth) / 2;
  const offsetY = (height - routeHeight) / 2;

  return track
    .map((point) => {
      const x = offsetX + (point.longitude - minLon) * scale;
      const y = height - offsetY - (point.latitude - minLat) * scale;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
});

const parsedRoutePoints = computed(() =>
  routePoints.value
    .split(' ')
    .filter(Boolean)
    .map((point) => {
      const [x, y] = point.split(',').map(Number);
      return { x: x ?? 0, y: y ?? 0 };
    }),
);

const routeStart = computed(() => parsedRoutePoints.value[0] ?? null);
const routeAnchor = computed(() => {
  const points = parsedRoutePoints.value;
  if (points.length < 2) return null;
  const targetIndex = Math.min(points.length - 1, Math.floor(points.length * 0.65));
  return points[targetIndex] ?? null;
});

const routeEditorStyle = computed<CSSProperties>(() => {
  const anchor = routeAnchor.value;
  if (!anchor) return {};
  return {
    left: `${(anchor.x / 600) * 100}%`,
    top: `${(anchor.y / 300) * 100}%`,
  };
});

const stats = computed<DraggableStat[]>(() =>
  props.visibleStats.map((key) => ({
    key,
    ...getActivityShareStat(props.activity, key),
  })),
);

const draggableStats = computed<DraggableStat[]>({
  get: () => stats.value.map((stat) => ({ ...stat })),
  set: (items) => {
    emit(
      'reorderStats',
      items.map((item) => item.key),
    );
  },
});

const activityDate = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(props.activity.startedAt)),
);
</script>

<template>
  <div
    class="artwork"
    :class="{
      'artwork--dragging-stats': isDraggingStats,
      'artwork--transparent': transparentBackground,
    }"
    :style="{
      '--share-background': backgroundColor,
      '--share-route': routeColor,
      '--share-text': textColor,
    }"
  >
    <ShareCardColorEditor
      class="artwork__background-editor export-hidden"
      label="Цвет фона"
      placement="bottom"
      :color="backgroundColor"
      @change="emit('setColor', 'backgroundColor', $event)"
    />

    <div class="artwork__heading">
      <div class="artwork__meta">
        <span class="artwork__brand">RUNVISION</span>
        <span class="artwork__date">{{ activityDate }}</span>
      </div>

      <div class="artwork__title">
        <span ref="titleTextRef" class="artwork__title-text">
          {{ activity.name || 'Тренировка' }}
        </span>

        <ShareCardColorEditor
          class="artwork__title-editor export-hidden"
          label="Цвет текста"
          placement="left"
          :color="textColor"
          @change="emit('setColor', 'textColor', $event)"
        />
      </div>
    </div>

    <div class="artwork__route">
      <svg
        ref="svgRef"
        viewBox="0 0 600 300"
        role="img"
        aria-label="Маршрут тренировки"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline
          v-if="routePoints"
          :points="routePoints"
          fill="none"
          :stroke="routeColor"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle v-if="routeStart" :cx="routeStart.x" :cy="routeStart.y" r="7" :fill="routeColor" />
      </svg>

      <div v-if="routeAnchor" class="artwork__route-editor-wrapper" :style="routeEditorStyle">
        <ShareCardColorEditor
          class="artwork__route-editor export-hidden"
          label="Цвет маршрута"
          :color="routeColor"
          @change="emit('setColor', 'routeColor', $event)"
        />
      </div>
    </div>

    <div class="artwork__stats">
      <Draggable
        v-model="draggableStats"
        item-key="key"
        :animation="180"
        ghost-class="stat--ghost"
        chosen-class="stat--chosen"
        fallback-class="stat--fallback"
        :delay="210"
        :delay-on-touch-only="true"
        :touch-start-threshold="5"
        :force-fallback="true"
        class="artwork__stats-grid"
        @start="isDraggingStats = true"
        @end="isDraggingStats = false"
      >
        <template #item="{ element }: { element: DraggableStat }">
          <ShareCardStatItem
            :label="element.label"
            :value="element.value"
            :width="props.statWidths[element.key] ?? 'half'"
            :class="{ 'stat--full': props.statWidths[element.key] === 'full' }"
            @remove="emit('removeStat', element.key)"
            @toggle-width="
              emit(
                'setStatWidth',
                element.key,
                props.statWidths[element.key] === 'full' ? 'half' : 'full',
              )
            "
          />
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style scoped>
.artwork {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 600px;
  margin-inline: auto;
  padding: clamp(16px, 4vw, 32px);
  overflow: hidden;
  border-radius: 16px;
  font-family: Inter, Arial, sans-serif;

  --share-background: #111827;
  --share-route: #fff;
  --share-text: #fff;

  color: var(--share-text);
  background: var(--share-background);
}

:global(.artwork--exporting .export-hidden) {
  display: none !important;
}

.artwork__heading {
  margin-top: 8px;
  padding-right: 42px;
}

.artwork__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.artwork__brand {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.artwork__date {
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.artwork__title {
  position: relative;
  margin-top: 8px;
  width: max-content;
  overflow-wrap: anywhere;
  font-size: clamp(23px, 5vw, 34px);
  font-weight: 800;
  line-height: 1;
}

.artwork__title-editor {
  position: absolute;
  z-index: 5;
  transform: translateY(-2px);
}

.artwork__background-editor {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
}

.artwork__route {
  position: relative;
  margin: 20px -8px 12px;
}

.artwork__route-editor-wrapper {
  position: absolute;
  z-index: 5;
  transform: translate(20%, -40%);
}

.artwork__route-editor {
  pointer-events: auto;
}

.artwork__route svg {
  display: block;
  width: 100%;
  height: auto;
}

.artwork__stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.artwork__stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

:deep(.stat) {
  border-style: solid;
}

.artwork--dragging-stats :deep(.stat) {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--share-text) 45%, transparent);
}

:deep(.stat--chosen) {
  cursor: grabbing;
}

:deep(.stat--ghost) {
  opacity: 0.35;
}

.artwork__stat--primary .artwork__stat-value {
  font-size: clamp(28px, 6vw, 38px);
}

:deep(.stat--full) {
  grid-column: 1 / -1;
}

.artwork--transparent {
  background-color: #242424 !important;
  background-image:
    linear-gradient(45deg, #383838 25%, transparent 25%),
    linear-gradient(-45deg, #383838 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #383838 75%),
    linear-gradient(-45deg, transparent 75%, #383838 75%) !important;
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}
@media (max-width: 420px) {
  .artwork__heading {
    padding-right: 38px;
  }

  .artwork__date {
    font-size: 9px;
  }

  .artwork__stats-grid {
    gap: 8px;
  }

  .artwork__title-editor {
    right: -38px;
  }
}
</style>
