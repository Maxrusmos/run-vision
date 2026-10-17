<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    /** Сбрасывать нечего (режим шаблона без изменений). */
    disabled?: boolean;
    /** Пояснение в диалоге: к чему вернётся карточка. */
    description?: string;
  }>(),
  {
    description:
      'Карточка вернётся к исходному виду шаблона: цвета, показатели, трек, название и фоновое фото. Сброс можно отменить стрелкой «назад».',
  },
);

const emit = defineEmits<{
  confirm: [];
}>();

const isDialogOpen = ref(false);

function confirm() {
  isDialogOpen.value = false;
  emit('confirm');
}
</script>

<template>
  <button
    type="button"
    class="history-actions__button"
    aria-label="Сбросить оформление"
    title="Сбросить оформление"
    :disabled="disabled"
    @click="isDialogOpen = true"
  >
    <v-icon icon="mdi-restore" size="20" />
  </button>

  <v-dialog v-model="isDialogOpen" max-width="360">
    <v-card class="reset-card-dialog">
      <div class="reset-card-dialog__title">Сбросить оформление?</div>
      <div class="reset-card-dialog__text">{{ description }}</div>

      <div class="reset-card-dialog__actions">
        <v-btn variant="tonal" @click="isDialogOpen = false">Отмена</v-btn>
        <v-btn color="primary" variant="flat" @click="confirm">Сбросить</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.reset-card-dialog {
  padding: 20px;
}

.reset-card-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.reset-card-dialog__text {
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.45;
}

.reset-card-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.reset-card-dialog__actions > .v-btn {
  flex: 1 1 0;
}
</style>
