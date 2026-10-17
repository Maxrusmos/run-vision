<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { useShareStore } from '@/stores/share.store';
import { ROUTE_NAMES } from '@/router/routes';
import StepPage from '@/shared/ui/StepPage.vue';
import SectionHeading from '@/shared/ui/SectionHeading.vue';
import ActivitySummary from '@/components/activity/ActivitySummary.vue';
import ShareTypeSelector from '@/views/share-view/components/ShareTypeSelector.vue';
import PhotoTemplateCarousel from '@/views/share-view/components/PhotoTemplateCarousel.vue';
import { VIDEO_TEMPLATE_IDS } from '@/entities/activity/model/activity-share/photo-templates';

const router = useRouter();
const { activity } = storeToRefs(useActivityStore());
const { shareType, photoTemplateId, videoTemplateId } = storeToRefs(useShareStore());

function goToEditor() {
  router.push({
    name: shareType.value === 'video' ? ROUTE_NAMES.videoEditor : ROUTE_NAMES.photoEditor,
  });
}
</script>

<template>
  <StepPage v-if="activity">
    <ActivitySummary :activity="activity" />

    <SectionHeading title="Что создаём?" />
    <ShareTypeSelector v-model="shareType" />

    <template v-if="shareType === 'photo'">
      <v-divider />
      <SectionHeading
        title="Выбери стиль"
        description="Выбери один из готовых дизайнов — всё можно донастроить в редакторе"
      />
      <PhotoTemplateCarousel v-model="photoTemplateId" :activity="activity" />
    </template>

    <template v-else>
      <v-divider />
      <SectionHeading
        title="Выбери стиль"
        description="Тот же дизайн, что у фото, — по треку бежит точка, цифры растут"
      />
      <!-- Пока в видео только «Минимализм»: остальные стили — «скоро». -->
      <PhotoTemplateCarousel
        v-model="videoTemplateId"
        :activity="activity"
        :available-ids="VIDEO_TEMPLATE_IDS"
      />
    </template>

    <template #footer>
      <v-btn color="primary" variant="flat" @click="goToEditor"> Продолжить </v-btn>
    </template>
  </StepPage>
</template>
