<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { dragTrash, useDragTrashZone } from '@/hooks/useDragTrash';

/**
 * Корзина редактора: пока элемент карточки тащат, она закрывает нижнюю панель
 * инструментов — всегда в одном месте, вне карточки. Отпустили над ней — удалить.
 */
const zone = useTemplateRef<HTMLElement>('zone');
useDragTrashZone(zone);
</script>

<template>
  <Transition name="trash-zone">
    <div
      v-show="dragTrash.state.active"
      ref="zone"
      class="trash-zone"
      :class="{ 'trash-zone--over': dragTrash.state.over }"
      role="status"
      aria-live="polite"
    >
      <v-icon
        :icon="dragTrash.state.over ? 'mdi-delete-empty' : 'mdi-delete-outline'"
        size="26"
        class="trash-zone__icon"
      />
      <span class="trash-zone__text">
        {{
          dragTrash.state.over ? 'Отпустите — элемент удалится' : 'Перетащите сюда, чтобы удалить'
        }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.trash-zone {
  position: absolute;
  z-index: 20;
  /* Чуть выше панели инструментов — проще попасть пальцем. */
  inset: -12px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-bottom: env(safe-area-inset-bottom);
  color: #ff8a8d;
  border-top: 1px dashed color-mix(in srgb, #e5484d 60%, transparent);
  background: color-mix(in srgb, #e5484d 14%, var(--app-background));
  pointer-events: none;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.trash-zone--over {
  color: #fff;
  border-top-style: solid;
  background: #c93a3f;
}

.trash-zone__icon {
  transition: transform 0.15s;
}

.trash-zone--over .trash-zone__icon {
  transform: scale(1.2);
}

.trash-zone__text {
  font-size: 14px;
  font-weight: 600;
}

.trash-zone-enter-active,
.trash-zone-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.trash-zone-enter-from,
.trash-zone-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .trash-zone-enter-active,
  .trash-zone-leave-active {
    transition: none;
  }
}
</style>
