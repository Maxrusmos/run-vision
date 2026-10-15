<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <button
    type="button"
    class="template-card"
    :class="{ 'template-card--selected': selected }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <div class="template-card__preview">
      <slot name="preview" />

      <v-icon
        v-if="selected"
        class="template-card__check"
        icon="mdi-check-circle"
        color="primary"
        size="22"
      />
    </div>

    <span class="template-card__title">{{ title }}</span>
    <span class="template-card__description">{{ description }}</span>
  </button>
</template>

<style scoped>
.template-card {
  display: flex;
  width: 164px;
  height: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin-right: 12px;
  padding: 0 0 8px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--app-on-surface);
  text-align: left;
  cursor: pointer;
}

.template-card:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 3px;
}

.template-card__preview {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.template-card--selected .template-card__preview {
  outline: 2px solid var(--app-primary);
  outline-offset: -2px;
}

.template-card__check {
  position: absolute;
  z-index: 3;
  top: 8px;
  right: 8px;
  border-radius: 50%;
}

.template-card__title {
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.template-card__description {
  padding: 0 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .template-card {
    width: 148px;
  }
}
</style>
