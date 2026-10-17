<script setup lang="ts">
import { computed } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import type { PhotoTemplateId } from '@/entities/activity/model/activity-share/activity-share.types';
import { PHOTO_TEMPLATES } from '@/entities/activity/model/activity-share/photo-templates';
import { projectRoute, toSvgPolylinePoints } from '@/entities/activity/lib/route-projection';
import {
  formatClockDuration,
  formatPace,
  formatPlaybackDistance,
} from '@/shared/lib/formatters/formatters';
import PhotoTemplateCard from '@/views/share-view/components/PhotoTemplateCard.vue';
import TemplateRoutePreview from '@/views/share-view/components/TemplateRoutePreview.vue';
import { useShareDraftsStore } from '@/stores/share-drafts.store';

const PREVIEW_VIEWPORT = { width: 100, height: 100, padding: 12 };

const props = defineProps<{
  activity: IActivity;
}>();

const selected = defineModel<PhotoTemplateId>({ required: true });

const draftsStore = useShareDraftsStore();

/** Шаблон уже настраивали — превью в цветах черновика (оформление и цвет трека). */
function getDraftColors(templateId: PhotoTemplateId) {
  const draft = draftsStore.drafts[templateId];
  return draft
    ? { background: draft.backgroundColor, route: draft.routeColor, text: draft.textColor }
    : null;
}

const routePoints = computed(() =>
  toSvgPolylinePoints(projectRoute(props.activity.track, PREVIEW_VIEWPORT)),
);

const distanceLabel = computed(() => `${formatPlaybackDistance(props.activity.distanceMeters)} км`);

const secondaryLabel = computed(() => {
  const pace = props.activity.averagePaceSecondsPerKm;
  const paceLabel = pace > 0 ? `${formatPace(pace)} /км` : '—';
  return `${formatClockDuration(props.activity.durationSeconds)} · ${paceLabel}`;
});
</script>

<template>
  <!-- Выбранный шаблон — по центру (и при возврате из редактора, и после перезагрузки). -->
  <v-slide-group
    v-model="selected"
    show-arrows="desktop"
    center-active
    mandatory
    class="template-carousel"
  >
    <v-slide-group-item v-for="template in PHOTO_TEMPLATES" :key="template.id" :value="template.id">
      <PhotoTemplateCard
        :title="template.title"
        :description="template.description"
        :selected="selected === template.id"
        :edited="Boolean(draftsStore.drafts[template.id])"
        @select="selected = template.id"
      >
        <template #preview>
          <TemplateRoutePreview
            :template-id="template.id"
            :colors="getDraftColors(template.id)"
            :route-points="routePoints"
            :primary-label="distanceLabel"
            :secondary-label="secondaryLabel"
          />
        </template>
      </PhotoTemplateCard>
    </v-slide-group-item>
  </v-slide-group>
</template>

<style scoped>
.template-carousel {
  width: 100%;
}
</style>
