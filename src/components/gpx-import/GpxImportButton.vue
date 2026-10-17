<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTemplateRef } from 'vue';
import { useActivityStore } from '@/stores/activity.store';

/**
 * iOS сопоставляет accept с типами файлов (UTI). У .gpx нет системного типа:
 * в зависимости от источника файл бывает помечен как GPX, XML или вообще без типа,
 * и тогда он недоступен для выбора. Поэтому перечисляем и XML-типы.
 */
const GPX_ACCEPT = '.gpx,application/gpx+xml,application/xml,text/xml';

withDefaults(
  defineProps<{
    /** Только иконка — для узких экранов. */
    compact?: boolean;
    label?: string;
    variant?: 'tonal' | 'flat' | 'text' | 'outlined';
    size?: 'small' | 'default' | 'large';
    /** Иконка кнопки; пустая строка — без иконки. */
    icon?: string;
    /** Разрешить выбор любых файлов — запасной путь, если фильтр не пускает GPX. */
    acceptAll?: boolean;
    /** Кнопка во всю ширину. */
    block?: boolean;
    disabled?: boolean;
  }>(),
  {
    compact: false,
    label: 'Импортировать GPX',
    variant: 'tonal',
    size: 'default',
    acceptAll: false,
    block: false,
    disabled: false,
    icon: 'mdi-upload',
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
  <div class="gpx-import-button" :class="{ 'gpx-import-button--block': block }">
    <v-btn
      v-if="compact"
      color="primary"
      :icon="icon || 'mdi-upload'"
      :variant="variant"
      :size="size"
      :loading="isImporting"
      :aria-label="label"
      @click="openFileDialog"
    />
    <v-btn
      v-else
      color="primary"
      :prepend-icon="icon || undefined"
      :variant="variant"
      :size="size"
      :block="block"
      :disabled="disabled"
      :loading="isImporting"
      @click="openFileDialog"
    >
      {{ label }}
    </v-btn>

    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      :accept="acceptAll ? undefined : GPX_ACCEPT"
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

.gpx-import-button--block {
  display: flex;
}
</style>
