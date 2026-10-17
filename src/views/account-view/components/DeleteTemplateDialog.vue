<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SavedTemplate } from '@/entities/saved-template';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';

/** Подтверждение удаления шаблона: удаляет сам и сообщает `deleted`. */
const props = defineProps<{
  /** Шаблон к удалению; null — диалог закрыт. */
  template: SavedTemplate | null;
}>();

const emit = defineEmits<{
  close: [];
  deleted: [id: string];
}>();

const savedTemplates = useSavedTemplatesStore();
const error = ref('');
const isDeleting = ref(false);

watch(
  () => props.template,
  () => (error.value = ''),
);

async function remove() {
  const template = props.template;
  if (!template || isDeleting.value) return;
  isDeleting.value = true;
  error.value = '';
  try {
    await savedTemplates.remove(template.id);
    emit('deleted', template.id);
  } catch (removeError) {
    error.value = isApiError(removeError) ? removeError.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <v-dialog
    :model-value="template !== null"
    max-width="360"
    :persistent="isDeleting"
    @update:model-value="!$event && emit('close')"
  >
    <v-card class="delete-template-dialog">
      <div class="delete-template-dialog__title">Удалить шаблон?</div>
      <div class="delete-template-dialog__text">
        «{{ template?.name }}» пропадёт из «Моих шаблонов» на всех устройствах. Карточки, которые вы
        уже сохранили картинкой, не изменятся.
      </div>
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="delete-template-dialog__alert"
      >
        {{ error }}
      </v-alert>
      <div class="delete-template-dialog__actions">
        <v-btn variant="tonal" :disabled="isDeleting" @click="emit('close')">Отмена</v-btn>
        <v-btn color="error" variant="flat" :loading="isDeleting" @click="remove">Удалить</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.delete-template-dialog {
  padding: 20px;
}

.delete-template-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.delete-template-dialog__text {
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.45;
}

.delete-template-dialog__alert {
  margin-top: 12px;
}

.delete-template-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.delete-template-dialog__actions > .v-btn {
  flex: 1 1 0;
  letter-spacing: 0;
  text-transform: none;
}
</style>
