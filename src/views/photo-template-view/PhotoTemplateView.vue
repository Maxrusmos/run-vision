<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { useShareStore } from '@/stores/share.store';
import { ROUTE_NAMES } from '@/router/routes';
import StepPage from '@/shared/ui/StepPage.vue';
import SectionHeading from '@/shared/ui/SectionHeading.vue';
import ActivityRequiredState from '@/components/activity/ActivityRequiredState.vue';
import ActivitySummary from '@/components/activity/ActivitySummary.vue';
import PhotoTemplateCarousel from '@/views/photo-template-view/components/PhotoTemplateCarousel.vue';

const router = useRouter();
const { activity } = storeToRefs(useActivityStore());
const { photoTemplateId } = storeToRefs(useShareStore());

function goBack() {
  router.push({ name: ROUTE_NAMES.shareType });
}

function goNext() {
  router.push({ name: ROUTE_NAMES.photoEditor });
}
</script>

<template>
  <StepPage>
    <template v-if="activity">
      <ActivitySummary :activity="activity" />
      <SectionHeading
        title="Выбери стиль"
        description="Выбери готовый дизайн или создай собственный"
      />
      <PhotoTemplateCarousel v-model="photoTemplateId" :activity="activity" />
    </template>

    <ActivityRequiredState v-else />

    <template #footer>
      <v-btn variant="tonal" @click="goBack">Назад</v-btn>
      <v-btn color="primary" variant="flat" :disabled="!activity" @click="goNext">
        Продолжить
      </v-btn>
    </template>
  </StepPage>
</template>
