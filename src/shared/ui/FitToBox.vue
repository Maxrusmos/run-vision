<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useResizeObserver } from '@/hooks/useResizeObserver';

/**
 * Вписывает содержимое в доступную область без прокрутки: если содержимое
 * не помещается по высоте или ширине, оно пропорционально уменьшается.
 * Содержимое раскладывается в полную ширину области (не шире maxWidth).
 */
const props = withDefaults(
  defineProps<{
    maxWidth?: number;
    /** Отступ от краёв области. */
    padding?: number;
  }>(),
  { maxWidth: 600, padding: 12 },
);

const box = useTemplateRef<HTMLElement>('box');
const content = useTemplateRef<HTMLElement>('content');

const scale = ref(1);
const contentWidth = ref(props.maxWidth);

useResizeObserver(
  () => [box.value, content.value],
  () => {
    const boxElement = box.value;
    const contentElement = content.value;
    if (!boxElement || !contentElement) return;

    const availableWidth = Math.max(0, boxElement.clientWidth - props.padding * 2);
    const availableHeight = Math.max(0, boxElement.clientHeight - props.padding * 2);
    contentWidth.value = Math.min(props.maxWidth, availableWidth);

    // offsetHeight — размер без учёта transform, поэтому масштаб не «скачет».
    const height = contentElement.offsetHeight;
    scale.value = height ? Math.min(1, availableHeight / height) : 1;
  },
);
</script>

<template>
  <div ref="box" class="fit-to-box">
    <div
      ref="content"
      class="fit-to-box__content"
      :style="{ width: `${contentWidth}px`, transform: `translate(-50%, -50%) scale(${scale})` }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.fit-to-box {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.fit-to-box__content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
}
</style>
