<script setup lang="ts">
import { useTemplateRef } from 'vue';
import SettingCard from '@/shared/ui/SettingCard.vue';

defineProps<{
  hasImage: boolean;
}>();

const emit = defineEmits<{
  upload: [file: File];
  remove: [];
}>();

const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (file?.type.startsWith('image/')) {
    emit('upload', file);
  }
}
</script>

<template>
  <SettingCard
    :title="hasImage ? 'Фото загружено' : 'Фоновое изображение'"
    :description="hasImage ? 'Можно заменить или удалить фото' : 'Использовать своё фото'"
  >
    <template #preview>
      <span class="background-image-preview">
        <v-icon icon="mdi-image-plus-outline" size="24" />
      </span>
    </template>

    <template #actions>
      <v-btn
        v-if="hasImage"
        icon="mdi-delete-outline"
        size="small"
        variant="text"
        color="error"
        aria-label="Удалить фоновое изображение"
        @click="emit('remove')"
      />
      <v-btn
        icon="mdi-upload"
        size="small"
        variant="tonal"
        aria-label="Загрузить фоновое изображение"
        @click="openFilePicker"
      />
    </template>
  </SettingCard>

  <input
    ref="fileInput"
    class="visually-hidden"
    type="file"
    accept="image/*"
    tabindex="-1"
    aria-hidden="true"
    @change="handleFileChange"
  />
</template>

<style scoped>
.background-image-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: var(--app-hover-bg);
}
</style>
