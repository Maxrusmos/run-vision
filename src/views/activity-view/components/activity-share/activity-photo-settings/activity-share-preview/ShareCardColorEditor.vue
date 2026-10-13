<script setup lang="ts">
defineProps<{
  color: string;
  label: string;
}>();

const emit = defineEmits<{
  change: [color: string];
}>();
</script>

<template>
  <label class="color-editor" :aria-label="label" :title="label">
    <span class="color-editor__swatch" :style="{ backgroundColor: color }" />

    <v-icon class="color-editor__icon" icon="mdi-eyedropper-variant" size="small" />

    <input
      class="color-editor__input"
      type="color"
      :value="color"
      :aria-label="label"
      @input="emit('change', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<style scoped>
.color-editor {
  --editor-size: 32px;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--editor-size);
  height: var(--editor-size);
  flex: 0 0 auto;
  color: white;
  background: transparent;
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  cursor: pointer;
  isolation: isolate;
  font-size: 14px;

  transition: transform 180ms ease;
}

.color-editor:active {
  transform: scale(1.2);
}

.color-editor__swatch {
  position: absolute;
  inset: 3px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 50%;
}

.color-editor__icon {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 70%));
}

.color-editor__input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
