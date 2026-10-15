<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import Draggable from 'vuedraggable';
import type {
  ShareStat,
  ShareStatKey,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { DEFAULT_SHARE_STAT_WIDTH } from '@/entities/activity/model/activity-share/activity-share-stat-options';
import { useFlipAnimation } from '@/hooks/useFlipAnimation';
import ShareCardStatItem from '@/views/photo-editor-view/components/artwork/ShareCardStatItem.vue';

const props = defineProps<{
  stats: ShareStat[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  showBorders: boolean;
}>();

const emit = defineEmits<{
  reorder: [keys: ShareStatKey[]];
  remove: [key: ShareStatKey];
  setWidth: [key: ShareStatKey, width: ShareStatWidth];
}>();

const selectedStat = defineModel<ShareStatKey | null>('selected', { default: null });

const isDragging = ref(false);
const draggable = useTemplateRef<InstanceType<typeof Draggable>>('draggable');
const gridElement = computed(() => draggable.value?.$el as HTMLElement | undefined);

// Анимируем изменение ширины, добавление и удаление показателей.
// Порядок не учитываем: перетаскивание анимирует сам Sortable.
useFlipAnimation(gridElement, () => ({
  keys: props.stats.map((stat) => stat.key).sort(),
  widths: props.statWidths,
}));

const draggableStats = computed<ShareStat[]>({
  get: () => props.stats.map((stat) => ({ ...stat })),
  set: (items) =>
    emit(
      'reorder',
      items.map((item) => item.key),
    ),
});

function getWidth(key: ShareStatKey): ShareStatWidth {
  return props.statWidths[key] ?? DEFAULT_SHARE_STAT_WIDTH;
}

function toggleSelected(key: ShareStatKey) {
  selectedStat.value = selectedStat.value === key ? null : key;
}

function remove(key: ShareStatKey) {
  if (selectedStat.value === key) {
    selectedStat.value = null;
  }
  emit('remove', key);
}

function handleDragStart() {
  isDragging.value = true;
  selectedStat.value = null;
}
</script>

<template>
  <Draggable
    ref="draggable"
    v-model="draggableStats"
    item-key="key"
    class="stats-grid"
    :class="{ 'stats-grid--dragging': isDragging }"
    :animation="180"
    ghost-class="stat--ghost"
    chosen-class="stat--chosen"
    fallback-class="stat--fallback"
    :delay="210"
    :delay-on-touch-only="true"
    :touch-start-threshold="5"
    :force-fallback="true"
    @start="handleDragStart"
    @end="isDragging = false"
  >
    <template #item="{ element }: { element: ShareStat }">
      <ShareCardStatItem
        :data-flip-key="element.key"
        :label="element.label"
        :value="element.value"
        :width="getWidth(element.key)"
        :selected="selectedStat === element.key"
        :show-border="showBorders"
        @select="toggleSelected(element.key)"
        @remove="remove(element.key)"
        @set-width="emit('setWidth', element.key, $event)"
      />
    </template>
  </Draggable>
</template>

<style scoped>
.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--share-stat-spacing, 12px);
  min-width: 0;
  margin-top: var(--share-stat-spacing, 12px);
}

.stats-grid--dragging :deep(.stat) {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--share-text) 45%, transparent);
}

.stats-grid :deep(.stat--chosen) {
  cursor: grabbing;
}

.stats-grid :deep(.stat--ghost) {
  opacity: 0.35;
}
</style>
