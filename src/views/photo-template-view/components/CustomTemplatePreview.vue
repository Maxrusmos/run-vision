<template>
  <div class="custom-preview">
    <v-icon icon="mdi-plus-circle-outline" size="38" />
    <span class="custom-preview__title">Твой дизайн</span>
    <span class="custom-preview__caption">Настрой всё под себя</span>
  </div>
</template>

<style scoped>
.custom-preview {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--app-border);
  border-radius: inherit;
  background: color-mix(in srgb, var(--app-on-surface) 2.5%, transparent);
  color: var(--app-primary);
}

.custom-preview__title {
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.custom-preview__caption {
  padding: 0 12px;
  color: var(--app-on-surface);
  font-size: 11px;
  text-align: center;
}
</style>
