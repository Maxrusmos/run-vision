<script setup lang="ts">
defineProps<{
  selected: boolean;
  icon: string;
  title: string;
  description?: string;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <button
    type="button"
    class="selectable-card"
    :class="{ 'selectable-card--selected': selected }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <v-icon :icon="icon" size="32" />
    <span class="selectable-card__title">{{ title }}</span>
    <span v-if="description" class="selectable-card__description">{{ description }}</span>
    <v-icon v-if="selected" class="selectable-card__check" icon="mdi-check-circle" size="20" />
  </button>
</template>

<style scoped>
.selectable-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 132px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  color: var(--app-on-surface);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.selectable-card:hover {
  background: var(--app-hover-bg);
}

.selectable-card:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.selectable-card--selected {
  border-color: var(--app-primary);
  box-shadow: inset 0 0 0 1px var(--app-primary);
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.selectable-card__title {
  font-size: 15px;
  font-weight: 600;
}

.selectable-card__description {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
  line-height: 1.4;
}

.selectable-card--selected .selectable-card__description {
  color: color-mix(in srgb, var(--app-primary) 78%, var(--app-on-surface));
}

.selectable-card__check {
  position: absolute;
  top: 10px;
  right: 10px;
}

@media (max-width: 600px) {
  .selectable-card {
    min-height: 112px;
    padding: 12px;
  }
}
</style>
