<script setup lang="ts">
import { computed } from 'vue';
import { formatActivityDate } from '@/shared/lib/formatters/formatters';
import ColorPickerButton from '@/shared/ui/ColorPickerButton.vue';

const props = defineProps<{
  title: string;
  date: Date;
  textColor: string;
}>();

const emit = defineEmits<{
  changeTextColor: [color: string];
}>();

const formattedDate = computed(() => formatActivityDate(props.date));
</script>

<template>
  <div class="artwork-header">
    <div class="artwork-header__meta">
      <span class="artwork-header__brand">RUNVISION</span>
      <span class="artwork-header__date">{{ formattedDate }}</span>
    </div>

    <div class="artwork-header__title">
      <span>{{ title || 'Тренировка' }}</span>
      <ColorPickerButton
        class="artwork-header__title-editor export-hidden"
        label="Цвет текста"
        :color="textColor"
        @change="emit('changeTextColor', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.artwork-header {
  margin-top: 8px;
  padding-right: 42px;
}

.artwork-header__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.artwork-header__brand {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.artwork-header__date {
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.artwork-header__title {
  position: relative;
  max-width: 100%;
  width: max-content;
  margin-top: 8px;
  overflow-wrap: anywhere;
  font-size: clamp(23px, 5vw, 34px);
  font-weight: 800;
  line-height: 1;
}

.artwork-header__title-editor {
  position: absolute;
  z-index: 5;
  transform: translateY(-2px);
}

@media (max-width: 420px) {
  .artwork-header {
    padding-right: 38px;
  }

  .artwork-header__date {
    font-size: 9px;
  }

  .artwork-header__title-editor {
    right: -38px;
  }
}
</style>
