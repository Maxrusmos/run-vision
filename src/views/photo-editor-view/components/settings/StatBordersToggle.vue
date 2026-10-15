<script setup lang="ts">
import SettingToggle from '@/shared/ui/SettingToggle.vue';

const enabled = defineModel<boolean>({ required: true });
</script>

<template>
  <SettingToggle
    v-model="enabled"
    title="Границы показателей"
    description="Показывать рамки вокруг статистики"
  >
    <template #preview>
      <span class="stat-borders-preview">
        <v-icon icon="mdi-card-outline" size="24" />
      </span>
    </template>
  </SettingToggle>
</template>

<style scoped>
.stat-borders-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-primary);
  background: var(--app-hover-bg);
}
</style>
