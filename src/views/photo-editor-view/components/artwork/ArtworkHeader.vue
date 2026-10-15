<script setup lang="ts">
import { computed } from 'vue';
import { formatActivityDate } from '@/shared/lib/formatters/formatters';
import ArtworkTitle from '@/views/photo-editor-view/components/artwork/ArtworkTitle.vue';

const props = defineProps<{
  title: string;
  date: Date;
  textColor: string;
  titleSelected: boolean;
}>();

const emit = defineEmits<{
  selectTitle: [];
  changeTitle: [value: string];
  changeTextColor: [color: string];
}>();

const formattedDate = computed(() => formatActivityDate(props.date));
</script>

<template>
  <div class="artwork-header">
    <div class="artwork-header__meta">
      <span class="artwork-header__brand">RUNVISION</span>
      <span class="artwork-header__date">{{ formattedDate }}</span>
    </div>

    <ArtworkTitle
      :value="title"
      :text-color="textColor"
      :selected="titleSelected"
      @select="emit('selectTitle')"
      @change="emit('changeTitle', $event)"
      @change-text-color="emit('changeTextColor', $event)"
    />
  </div>
</template>

<style scoped>
.artwork-header {
  margin-top: 8px;
  padding-right: 42px;
}

.artwork-header__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.artwork-header__brand {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.artwork-header__date {
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

@media (max-width: 420px) {
  .artwork-header {
    padding-right: 38px;
  }

  .artwork-header__date {
    font-size: 9px;
  }
}
</style>
