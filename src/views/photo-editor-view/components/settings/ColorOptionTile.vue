<script setup lang="ts">
import OptionTile from '@/views/photo-editor-view/components/settings/OptionTile.vue';

defineProps<{
  color: string;
  label: string;
  /** Для экранного диктора: что именно красим. */
  inputLabel: string;
  active?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  change: [color: string];
}>();
</script>

<template>
  <!-- Тап по плитке открывает системную палитру. -->
  <OptionTile tag="label" :label="label" :active="active" :disabled="disabled">
    <template #preview>
      <span class="color-tile__swatch" :style="{ background: color }">
        <v-icon icon="mdi-eyedropper-variant" size="18" />
      </span>
    </template>
    <input
      class="visually-hidden"
      type="color"
      :value="color"
      :aria-label="inputLabel"
      @input="emit('change', ($event.target as HTMLInputElement).value)"
    />
  </OptionTile>
</template>

<style scoped>
.color-tile__swatch {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #fff;
}

.color-tile__swatch :deep(.v-icon) {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 70%));
}
</style>
