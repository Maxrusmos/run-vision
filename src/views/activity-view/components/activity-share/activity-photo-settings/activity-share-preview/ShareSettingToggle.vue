<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  modelValue: boolean;
  active?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <button
    type="button"
    class="setting-toggle"
    :class="{
      'setting-toggle--active': !disabled && (active ?? modelValue),
      'setting-toggle--disabled': disabled,
    }"
    :aria-pressed="disabled ? false : modelValue"
    :aria-disabled="disabled"
    :disabled="disabled"
    @click="!disabled && emit('update:modelValue', !modelValue)"
  >
    <span class="setting-toggle__preview">
      <slot name="preview" />
    </span>

    <span class="setting-toggle__details">
      <span class="setting-toggle__title">{{ title }}</span>
      <span class="setting-toggle__description">{{ description }}</span>
    </span>

    <span class="setting-toggle__control" aria-hidden="true">
      <v-checkbox-btn
        :disabled="disabled"
        :model-value="disabled ? false : modelValue"
        color="primary"
        :ripple="false"
        tabindex="-1"
        class="setting-toggle__checkbox"
      />
    </span>
  </button>
</template>

<style scoped>
.setting-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    opacity 0.15s;
}

.setting-toggle:not(:disabled):hover {
  background: var(--app-hover-bg);
}

.setting-toggle--active {
  border-color: var(--app-primary);
}

.setting-toggle--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: rgba(var(--v-border-color), 0.04);
  border-color: rgba(var(--v-border-color), 0.15);
}

.setting-toggle--disabled .setting-toggle__title,
.setting-toggle--disabled .setting-toggle__description {
  color: rgb(var(--app-on-surface));
}

.setting-toggle--disabled .setting-toggle__preview {
  filter: grayscale(1);
}

.setting-toggle__preview {
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

.setting-toggle__details {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.setting-toggle__title {
  font-size: 13px;
  font-weight: 600;
}

.setting-toggle__description {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--app-on-surface));
  opacity: 0.65;
}

.setting-toggle__control {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
}

.setting-toggle__checkbox {
  flex: 0 0 auto;
}

.setting-toggle :deep(.v-selection-control) {
  flex: 0 0 auto;
  min-height: 32px;
}

.setting-toggle :deep(.v-selection-control__wrapper) {
  width: 32px;
  height: 32px;
}
</style>
