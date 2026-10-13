<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
}>();

const emit = defineEmits<{
  remove: [];
}>();
</script>

<template>
  <div class="stat">
    <button
      class="stat__remove export-hidden"
      type="button"
      aria-label="Удалить показатель"
      @click.stop="emit('remove')"
    >
      <v-icon icon="mdi-close" size="x-small" />
    </button>

    <div class="stat__label">{{ label }}</div>
    <div class="stat__value">{{ value }}</div>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--share-text) 18%, transparent);
  border-radius: 12px;
}

.stat__label {
  font-size: 11px;
  opacity: 0.7;
}

.stat__value {
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: clamp(19px, 4vw, 25px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat__remove {
  position: absolute;
  z-index: 2;
  top: -5px;
  right: -5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  padding: 0;
  color: white;
  background: #d94848;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.stat__label {
  padding-right: 14px;
}
</style>
