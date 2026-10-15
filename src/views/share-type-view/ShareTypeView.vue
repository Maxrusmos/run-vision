<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useShareStore } from '@/stores/share.store';
import { ROUTE_NAMES } from '@/router/routes';
import StepPage from '@/shared/ui/StepPage.vue';
import SectionHeading from '@/shared/ui/SectionHeading.vue';
import ShareTypeHero from '@/views/share-type-view/components/ShareTypeHero.vue';
import ShareTypeSelector from '@/views/share-type-view/components/ShareTypeSelector.vue';

const router = useRouter();
const { shareType } = storeToRefs(useShareStore());

function goNext() {
  router.push({
    name: shareType.value === 'photo' ? ROUTE_NAMES.photoTemplate : ROUTE_NAMES.video,
  });
}
</script>

<template>
  <StepPage>
    <ShareTypeHero />
    <SectionHeading title="Что создаём?" level="h2" />
    <ShareTypeSelector v-model="shareType" />

    <template #footer>
      <v-btn color="primary" variant="flat" @click="goNext">Продолжить</v-btn>
    </template>
  </StepPage>
</template>
