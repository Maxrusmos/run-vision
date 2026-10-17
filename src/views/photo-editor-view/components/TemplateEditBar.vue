<script setup lang="ts">
/** Полоса под шапкой редактора в режиме шаблона: что правится и сохранено ли. */
defineProps<{
  name: string;
  dirty: boolean;
  /** Шаблон показан на демо-пробежке. */
  demo: boolean;
}>();
</script>

<template>
  <div class="template-edit-bar" role="status">
    <v-icon icon="mdi-palette-outline" size="18" class="template-edit-bar__icon" />
    <div class="template-edit-bar__text">
      <span class="template-edit-bar__title">Шаблон «{{ name }}»</span>
      <span class="template-edit-bar__note">
        {{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}
        <template v-if="demo"> · на демо-пробежке</template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.template-edit-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-primary) 12%, var(--app-background));
}

.template-edit-bar__icon {
  color: var(--app-primary);
}

.template-edit-bar__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.template-edit-bar__title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-edit-bar__note {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
  line-height: 1.3;
}
</style>
