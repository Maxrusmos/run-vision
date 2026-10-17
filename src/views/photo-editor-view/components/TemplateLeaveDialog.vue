<script setup lang="ts">
/** Уход из режима шаблона с несохранёнными изменениями: сохранить, не сохранять или остаться. */
defineProps<{ saving: boolean }>();

const isOpen = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  save: [];
  discard: [];
}>();
</script>

<template>
  <v-dialog v-model="isOpen" max-width="380" :persistent="saving">
    <v-card class="template-leave-dialog">
      <div class="template-leave-dialog__title">Сохранить изменения шаблона?</div>
      <div class="template-leave-dialog__text">
        Без сохранения шаблон останется таким, каким был до правок.
      </div>
      <div class="template-leave-dialog__actions">
        <v-btn color="primary" variant="flat" block :loading="saving" @click="emit('save')">
          Сохранить и выйти
        </v-btn>
        <v-btn variant="tonal" block :disabled="saving" @click="emit('discard')">
          Выйти без сохранения
        </v-btn>
        <v-btn variant="text" block :disabled="saving" @click="isOpen = false">
          Продолжить редактирование
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.template-leave-dialog {
  padding: 20px;
}

.template-leave-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.template-leave-dialog__text {
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.45;
}

.template-leave-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.template-leave-dialog__actions .v-btn {
  letter-spacing: 0;
  text-transform: none;
}
</style>
