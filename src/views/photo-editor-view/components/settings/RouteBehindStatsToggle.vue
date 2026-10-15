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
    title="Трек под показателями"
    :description="
      disabled ? 'Добавьте трек на карточку, чтобы включить' : 'Показатели поверх маршрута'
    "
  >
    <template #preview>
      <span class="route-behind-preview">
        <v-icon icon="mdi-layers-outline" size="22" />
      </span>
    </template>
  </SettingToggle>
</template>

<style scoped>
.route-behind-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-primary);
  background: var(--app-hover-bg);
}
</style>
