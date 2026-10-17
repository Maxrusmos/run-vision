<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PLAN_LABELS } from '@/entities/user';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { useActivityStore } from '@/stores/activity.store';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { usePreviewActivity } from '@/hooks/usePreviewActivity';
import { useTemplatePreview } from '@/hooks/useTemplatePreview';
import StepPage from '@/shared/ui/StepPage.vue';
import SavedTemplateCard from '@/views/account-view/components/SavedTemplateCard.vue';

/** Личный кабинет: аккаунт и «Мои шаблоны». */
const router = useRouter();
const authStore = useAuthStore();
const activityStore = useActivityStore();
const savedTemplates = useSavedTemplatesStore();

const { activity: previewActivity, isDemo } = usePreviewActivity();
const { routePoints, primaryLabel, secondaryLabel } = useTemplatePreview(previewActivity);

// Каждый заход в кабинет — свежий список (шаблоны могли сохранить с другого устройства).
onMounted(() => void savedTemplates.load());

const errorMessage = computed(() => {
  const error = savedTemplates.error;
  if (!error) return '';
  return isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
});

const accountLine = computed(() => {
  const user = authStore.user;
  return user ? `${user.email} · ${PLAN_LABELS[user.plan]}` : 'Нет связи с сервером';
});

const isFirstLoad = computed(
  () => savedTemplates.status === 'loading' && savedTemplates.templates.length === 0,
);

function goCreate() {
  void router.push({
    name: activityStore.activity && !activityStore.isDemo ? ROUTE_NAMES.share : ROUTE_NAMES.import,
  });
}
</script>

<template>
  <StepPage>
    <div class="account-view__header">
      <h1 class="account-view__title">Мои шаблоны</h1>
      <p class="account-view__account">{{ accountLine }}</p>
    </div>

    <div v-if="isFirstLoad" class="account-view__grid" aria-busy="true">
      <v-skeleton-loader
        v-for="index in 4"
        :key="index"
        type="image"
        class="account-view__skeleton"
      />
    </div>

    <v-alert
      v-else-if="savedTemplates.status === 'error' && !savedTemplates.templates.length"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
      <template #append>
        <v-btn variant="text" @click="savedTemplates.load()">Повторить</v-btn>
      </template>
    </v-alert>

    <div v-else-if="!savedTemplates.templates.length" class="account-view__empty">
      <v-icon icon="mdi-star-outline" size="40" class="account-view__empty-icon" />
      <p class="account-view__empty-title">Здесь будут ваши шаблоны</p>
      <p class="account-view__empty-text">
        Настройте карточку в редакторе и нажмите звёздочку рядом со сбросом — оформление сохранится
        в аккаунте и подойдёт к любой тренировке.
      </p>
      <v-btn color="primary" variant="tonal" class="account-view__empty-action" @click="goCreate">
        Создать карточку
      </v-btn>
    </div>

    <template v-else>
      <div class="account-view__grid">
        <SavedTemplateCard
          v-for="template in savedTemplates.templates"
          :key="template.id"
          :template="template"
          :route-points="routePoints"
          :primary-label="primaryLabel"
          :secondary-label="secondaryLabel"
        />
      </div>
      <p v-if="isDemo" class="account-view__hint">
        Превью — на демо-пробежке. Загрузите свою тренировку, и шаблоны покажутся на ней.
      </p>
    </template>
  </StepPage>
</template>

<style scoped>
.account-view__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-view__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.account-view__account {
  margin: 0;
  overflow: hidden;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Две колонки на телефоне, больше — на широком экране. */
.account-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px 14px;
}

.account-view__skeleton {
  aspect-ratio: 3 / 4;
  border-radius: 12px;
}

.account-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 8px;
  text-align: center;
}

.account-view__empty-icon {
  color: color-mix(in srgb, var(--app-on-surface) 45%, transparent);
}

.account-view__empty-title {
  margin: 12px 0 6px;
  font-size: 17px;
  font-weight: 600;
}

.account-view__empty-text {
  max-width: 340px;
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

.account-view__empty-action {
  margin-top: 20px;
  letter-spacing: 0;
  text-transform: none;
}

.account-view__hint {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 55%, transparent);
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
}
</style>
