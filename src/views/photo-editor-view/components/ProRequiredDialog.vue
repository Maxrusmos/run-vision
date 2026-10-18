<script setup lang="ts">
/**
 * «Сохранить» на карточке с Pro-оформлением без подписки: подключить Pro или вернуть
 * обычное оформление шаблона. Посмотреть Pro-оформление можно, сохранить — нет.
 */
defineProps<{
  /** Название Pro-оформления на карточке. */
  designName: string;
}>();

const isOpen = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  upgrade: [];
  revert: [];
}>();
</script>

<template>
  <v-dialog v-model="isOpen" max-width="380">
    <v-card class="pro-required-dialog">
      <div class="pro-required-dialog__crown" aria-hidden="true">
        <v-icon icon="mdi-crown" size="26" />
      </div>
      <div class="pro-required-dialog__title">«{{ designName }}» — оформление Pro</div>
      <div class="pro-required-dialog__text">
        Посмотреть, как выглядит карточка, можно и так, а сохранить её с этим оформлением — с
        подпиской Pro. Или верните обычное оформление шаблона — всё остальное останется как есть.
      </div>
      <div class="pro-required-dialog__actions">
        <v-btn color="primary" variant="flat" size="large" block @click="emit('upgrade')">
          Подключить Pro
        </v-btn>
        <v-btn variant="tonal" size="large" block @click="emit('revert')">
          Вернуть обычное оформление
        </v-btn>
        <v-btn variant="text" block @click="isOpen = false">Отмена</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.pro-required-dialog {
  padding: 20px;
  text-align: center;
}

.pro-required-dialog__crown {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  place-items: center;
  color: #ffd76a;
  border-radius: 50%;
  background: color-mix(in srgb, #ffd76a 16%, transparent);
}

.pro-required-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.pro-required-dialog__text {
  margin: 8px 0 18px;
  color: color-mix(in srgb, var(--app-on-surface) 72%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

.pro-required-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pro-required-dialog__actions > .v-btn {
  letter-spacing: 0;
  text-transform: none;
}
</style>
