<script setup lang="ts">
/**
 * Предупреждение перед своим цветом, который что-то сбросит: стиль трека со своими цветами
 * («Радуга») или Pro-фон оформления («Аврора»). «Выбрать цвет» сбрасывает и сразу
 * открывает палитру (родитель в `confirm`, в том же нажатии).
 */
defineProps<{
  title: string;
  text: string;
}>();

const isOpen = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  confirm: [];
}>();
</script>

<template>
  <v-dialog v-model="isOpen" max-width="380">
    <v-card class="color-reset-dialog">
      <div class="color-reset-dialog__icon" aria-hidden="true">
        <v-icon icon="mdi-palette-swatch-outline" size="26" />
      </div>
      <div class="color-reset-dialog__title">{{ title }}</div>
      <div class="color-reset-dialog__text">{{ text }}</div>
      <div class="color-reset-dialog__actions">
        <v-btn color="primary" variant="flat" size="large" block @click="emit('confirm')">
          Выбрать цвет
        </v-btn>
        <v-btn variant="text" block @click="isOpen = false">Отмена</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.color-reset-dialog {
  padding: 20px;
  text-align: center;
}

.color-reset-dialog__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  place-items: center;
  color: var(--app-primary);
  border-radius: 50%;
  background: var(--app-primary-bg);
}

.color-reset-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.color-reset-dialog__text {
  margin: 8px 0 18px;
  color: color-mix(in srgb, var(--app-on-surface) 72%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

.color-reset-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-reset-dialog__actions > .v-btn {
  letter-spacing: 0;
  text-transform: none;
}
</style>
