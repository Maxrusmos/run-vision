<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTemplateRef } from 'vue';
import { useActivityStore } from '@/stores/activity.store';

withDefaults(
  defineProps<{
    /** Только иконка — для узких экранов. */
    compact?: boolean;
    label?: string;
    variant?: 'tonal' | 'flat' | 'text' | 'outlined';
    size?: 'small' | 'default' | 'large';
  }>(),
  {
    compact: false,
    label: 'Импортировать GPX',
    variant: 'tonal',
    size: 'default',
  },
);

const emit = defineEmits<{
  imported: [];
}>();

const activityStore = useActivityStore();
const { isImporting } = storeToRefs(activityStore);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

function openFileDialog() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  // Сбрасываем значение, чтобы повторный выбор того же файла снова вызвал change.
  input.value = '';

  if (file && (await activityStore.importGpx(file))) {
    emit('imported');
  }
}
</script>

<template>
  <div class="gpx-import-button">
    <v-btn
      v-if="compact"
      color="primary"
      icon="mdi-upload"
      :variant="variant"
      :size="size"
      :loading="isImporting"
      :aria-label="label"
      @click="openFileDialog"
    />
    <v-btn
      v-else
      color="primary"
      prepend-icon="mdi-upload"
      :variant="variant"
      :size="size"
      :loading="isImporting"
      @click="openFileDialog"
    >
      {{ label }}
    </v-btn>

    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept=".gpx,application/gpx+xml"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.gpx-import-button {
  display: inline-flex;
}
</style>
