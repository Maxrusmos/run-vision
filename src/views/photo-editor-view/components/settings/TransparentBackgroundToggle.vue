<script setup lang="ts">
import SettingToggle from '@/shared/ui/SettingToggle.vue';

defineProps<{
  backgroundColor: string;
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
      <span
        class="transparent-preview"
        :class="{ checkerboard: enabled }"
        :style="{ backgroundColor: enabled ? undefined : backgroundColor }"
      >
        <v-icon icon="mdi-image-outline" size="24" />
      </span>
    </template>
  </SettingToggle>
</template>

<style scoped>
.transparent-preview {
  --checkerboard-size: 14px;

  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}
</style>
