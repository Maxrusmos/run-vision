<script setup lang="ts">
import SettingToggle from '@/shared/ui/SettingToggle.vue';

defineProps<{
  disabled: boolean;
}>();

const enabled = defineModel<boolean>({ required: true });
</script>

<template>
  <SettingToggle
    v-model="enabled"
    :disabled="disabled"
    title="Прозрачный фон"
    :description="
      disabled
        ? 'Удалите фоновое фото, чтобы включить прозрачность'
        : 'Сохранить прозрачность в PNG'
    "
  >
    <template #preview>
      <!-- Иконка статична: не зависит ни от цвета фона, ни от состояния переключателя. -->
      <span class="transparent-preview checkerboard">
        <v-icon icon="mdi-image-outline" size="22" />
      </span>
    </template>
  </SettingToggle>
</template>

<style scoped>
.transparent-preview {
  --checkerboard-size: 12px;

  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #fff;
}
</style>
