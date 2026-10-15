<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  description: string;
  disabled?: boolean;
}>();

const checked = defineModel<boolean>({ required: true });

const isOn = computed(() => !props.disabled && checked.value);

function toggle() {
  if (!props.disabled) {
    checked.value = !checked.value;
  }
}
</script>

<template>
  <button
    type="button"
    class="setting-toggle"
    :class="{
      'setting-toggle--active': isOn,
      'setting-toggle--disabled': disabled,
    }"
    role="switch"
    :aria-checked="isOn"
    :disabled="disabled"
    @click="toggle"
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
        :model-value="isOn"
        color="primary"
        :ripple="false"
        tabindex="-1"
        readonly
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
  color: inherit;
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

.setting-toggle:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
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
  pointer-events: none;
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
