<script setup lang="ts">
import type { ShareType } from '@/entities/activity/model/activity-share/activity-share.types';
import SelectableCard from '@/shared/ui/SelectableCard.vue';
import { SHARE_TYPE_OPTIONS } from '@/views/share-type-view/share-type-options';

const selected = defineModel<ShareType>({ required: true });
</script>

<template>
  <div class="share-type-selector" role="group" aria-label="Тип контента">
    <SelectableCard
      v-for="option in SHARE_TYPE_OPTIONS"
      :key="option.value"
      :selected="selected === option.value"
      :icon="option.icon"
      :title="option.title"
      :description="option.description"
      @select="selected = option.value"
    />
  </div>
</template>

<style scoped>
.share-type-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
