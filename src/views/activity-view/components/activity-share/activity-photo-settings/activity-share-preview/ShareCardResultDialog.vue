<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  image: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [];
}>();
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    scrim="rgba(0, 0, 0, 0.9)"
    content-class="result-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-4">
      <div class="text-h6 font-weight-bold">Готовая карточка</div>

      <div class="text-body-2 text-medium-emphasis mb-4">
        Проверьте изображение перед сохранением
      </div>

      <img v-if="image" :src="image" alt="Итоговая карточка тренировки" class="result-image" />

      <div class="share-preview__footer">
        <v-btn variant="tonal" :disabled="loading" @click="emit('update:modelValue', false)">
          Отмена
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!image || loading"
          @click="emit('save')"
        >
          Сохранить
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.result-image {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 12px;
}

.share-preview__footer {
  margin-top: 12px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 480px) {
  .share-preview__footer {
    gap: 8px;
  }

  .share-preview__footer .v-btn {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>

<style>
.v-overlay:has(.result-dialog) .v-overlay__scrim {
  background: #000 !important;
  opacity: 0.8 !important;
}

.v-overlay:has(.result-dialog) .v-overlay__content {
  filter: none;
}
</style>
