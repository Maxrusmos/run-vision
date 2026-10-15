<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="setting-card">
    <span class="setting-card__preview">
      <slot name="preview" />
    </span>

    <span class="setting-card__details">
      <span class="setting-card__title">{{ title }}</span>
      <span class="setting-card__description">{{ description }}</span>
    </span>

    <div v-if="$slots.actions" class="setting-card__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.setting-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.setting-card__preview {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
}

.setting-card__details {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.setting-card__title {
  font-size: 13px;
  font-weight: 600;
}

.setting-card__description {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.65;
}

.setting-card__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-left: auto;
}

.setting-card__actions :deep(.v-btn) {
  width: 32px;
  height: 32px;
}
</style>
