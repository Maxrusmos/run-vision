<script setup lang="ts">
defineProps<{
  image?: string;
  /** Видео (object URL) вместо картинки. */
  video?: string;
  loading?: boolean;
}>();

const isOpen = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  save: [];
}>();
</script>

<template>
  <v-dialog v-model="isOpen" max-width="720" content-class="result-dialog">
    <v-card class="result-card">
      <div class="text-h6 font-weight-bold">{{ video ? 'Готовое видео' : 'Готовая карточка' }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        {{
          video ? 'Проверьте видео перед сохранением' : 'Проверьте изображение перед сохранением'
        }}
      </div>

      <div v-if="video" class="result-card__image-wrapper">
        <video
          :src="video"
          class="result-card__image"
          autoplay
          loop
          muted
          playsinline
          aria-label="Итоговое видео тренировки"
        />
      </div>
      <div v-else-if="image" class="result-card__image-wrapper checkerboard">
        <img :src="image" alt="Итоговая карточка тренировки" class="result-card__image" />
      </div>

      <div class="result-card__footer">
        <v-btn variant="tonal" :disabled="loading" @click="isOpen = false">Отмена</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!(image || video) || loading"
          @click="emit('save')"
        >
          Сохранить
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.result-card {
  padding: 16px;
}

.result-card__image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: 70vh;
  overflow: hidden;
  border-radius: 12px;
}

.result-card__image {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.result-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 480px) {
  .result-card__footer {
    gap: 8px;
  }

  .result-card__footer .v-btn {
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
</style>
