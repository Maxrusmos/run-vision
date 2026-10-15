<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { useShareStore } from '@/stores/share.store';
import { ROUTE_NAMES } from '@/router/routes';
import StepPage from '@/shared/ui/StepPage.vue';
import SectionHeading from '@/shared/ui/SectionHeading.vue';
import ActivitySummary from '@/components/activity/ActivitySummary.vue';
import ShareTypeHero from '@/views/share-view/components/ShareTypeHero.vue';
import ShareTypeSelector from '@/views/share-view/components/ShareTypeSelector.vue';
import PhotoTemplateCarousel from '@/views/share-view/components/PhotoTemplateCarousel.vue';
import VideoPlaceholder from '@/views/share-view/components/VideoPlaceholder.vue';

const router = useRouter();
const { activity } = storeToRefs(useActivityStore());
const { shareType, photoTemplateId } = storeToRefs(useShareStore());

function goToEditor() {
  router.push({ name: ROUTE_NAMES.photoEditor });
}
</script>

<template>
  <StepPage v-if="activity">
    <ShareTypeHero />
    <ActivitySummary :activity="activity" />

    <SectionHeading title="Что создаём?" />
    <ShareTypeSelector v-model="shareType" />

    <template v-if="shareType === 'photo'">
      <v-divider />
      <SectionHeading
        title="Выбери стиль"
        description="Выбери готовый дизайн или создай собственный"
      />
      <PhotoTemplateCarousel v-model="photoTemplateId" :activity="activity" />
    </template>

    <VideoPlaceholder v-else />

    <template #footer>
      <v-btn color="primary" variant="flat" :disabled="shareType !== 'photo'" @click="goToEditor">
        Продолжить
      </v-btn>
    </template>
  </StepPage>
</template>
