<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    level?: 'h1' | 'h2' | 'h3';
  }>(),
  { level: 'h2' },
);
</script>

<template>
  <div class="section-heading">
    <component :is="level" class="section-heading__title">{{ title }}</component>
    <p v-if="description" class="section-heading__description">{{ description }}</p>
  </div>
</template>

<style scoped>
.section-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-heading__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.section-heading__description {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
}
</style>
