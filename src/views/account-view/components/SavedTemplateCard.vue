<script setup lang="ts">
import { computed } from 'vue';
import type { SavedTemplate } from '@/entities/saved-template';
import { getPhotoTemplateTitle } from '@/entities/activity/model/activity-share/photo-templates';
import TemplateRoutePreview from '@/views/share-view/components/TemplateRoutePreview.vue';
import { ROUTE_NAMES } from '@/router/routes';

/** Плитка шаблона в «Моих шаблонах»: простое превью в цветах шаблона, название, основа, дата. */
const props = defineProps<{
  template: SavedTemplate;
  routePoints: string;
  primaryLabel: string;
  secondaryLabel: string;
}>();

const emit = defineEmits<{
  delete: [];
}>();

const colors = computed(() => ({
  background: props.template.settings.backgroundColor,
  route: props.template.settings.routeColor,
  text: props.template.settings.textColor,
}));

const meta = computed(() => {
  const date = new Date(props.template.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
  return `${getPhotoTemplateTitle(props.template.baseTemplate)} · ${date}`;
});
</script>

<template>
  <!-- Кнопка удаления — соседка ссылки, а не внутри неё (кнопка в ссылке — невалидно). -->
  <div class="saved-template-card-wrap">
    <router-link
      :to="{ name: ROUTE_NAMES.savedTemplate, params: { id: template.id } }"
      class="saved-template-card"
    >
      <div class="saved-template-card__preview">
        <TemplateRoutePreview
          :template-id="template.baseTemplate"
          :colors="colors"
          :route-points="routePoints"
          :primary-label="primaryLabel"
          :secondary-label="secondaryLabel"
        />
      </div>
      <span class="saved-template-card__name">{{ template.name }}</span>
      <span class="saved-template-card__meta">{{ meta }}</span>
    </router-link>
    <button
      type="button"
      class="saved-template-card__delete"
      :aria-label="`Удалить шаблон «${template.name}»`"
      @click="emit('delete')"
    >
      <v-icon icon="mdi-delete-outline" size="18" />
    </button>
  </div>
</template>

<style scoped>
.saved-template-card-wrap {
  position: relative;
  min-width: 0;
}

/* Удаление — в правом верхнем углу превью: кружок с подложкой, читается на любом фоне. */
.saved-template-card__delete {
  position: absolute;
  z-index: 3;
  top: 6px;
  right: 6px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  color: #fff;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 45%);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.saved-template-card__delete:active {
  background: rgb(0 0 0 / 65%);
}

.saved-template-card__delete:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.saved-template-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  color: var(--app-on-surface);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.saved-template-card:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 3px;
  border-radius: 12px;
}

.saved-template-card__preview {
  position: relative;
  aspect-ratio: 3 / 4;
  margin-bottom: 4px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.saved-template-card:active .saved-template-card__preview {
  opacity: 0.85;
}

.saved-template-card__name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-template-card__meta {
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 12px;
}
</style>
