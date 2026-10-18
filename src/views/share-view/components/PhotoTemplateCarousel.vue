<script setup lang="ts">
import type { IActivity } from '@/entities/activity/model/activity.types';
import type {
  PhotoTemplateId,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { PHOTO_TEMPLATES } from '@/entities/activity/model/activity-share/photo-templates';
import { useTemplatePreview } from '@/hooks/useTemplatePreview';
import PhotoTemplateCard from '@/views/share-view/components/PhotoTemplateCard.vue';
import TemplateRoutePreview from '@/views/share-view/components/TemplateRoutePreview.vue';
import { useShareDraftsStore } from '@/stores/share-drafts.store';

const props = defineProps<{
  activity: IActivity;
  /** Фото или видео — значок на превью каждого стиля. */
  shareType: ShareType;
  /** Какие стили можно выбрать (видео); остальные — «скоро». Без списка — все. */
  availableIds?: readonly PhotoTemplateId[];
}>();

function isAvailable(id: PhotoTemplateId) {
  return !props.availableIds || props.availableIds.includes(id);
}

const selected = defineModel<PhotoTemplateId>({ required: true });

const draftsStore = useShareDraftsStore();

/** Шаблон уже настраивали (в фото или в видео — у каждого свой черновик) — превью в его цветах. */
function getDraftColors(templateId: PhotoTemplateId) {
  const draft = draftsStore.peekDraft(props.shareType, templateId);
  return draft
    ? { background: draft.backgroundColor, route: draft.routeColor, text: draft.textColor }
    : null;
}

const {
  routePoints,
  primaryLabel: distanceLabel,
  secondaryLabel,
} = useTemplatePreview(() => props.activity);
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
    <v-slide-group-item
      v-for="template in PHOTO_TEMPLATES"
      :key="template.id"
      :value="template.id"
      :disabled="!isAvailable(template.id)"
    >
      <PhotoTemplateCard
        :title="template.title"
        :description="template.description"
        :selected="selected === template.id"
        :edited="Boolean(draftsStore.peekDraft(shareType, template.id))"
        :soon="!isAvailable(template.id)"
        :share-type="shareType"
        @select="isAvailable(template.id) && (selected = template.id)"
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
