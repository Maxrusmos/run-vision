<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getActivityShareStats } from '@/entities/activity/model/activity-share/activity-share-stats';
import { getPhotoTemplateTitle } from '@/entities/activity/model/activity-share/photo-templates';
import { SAVED_TEMPLATE_NAME_MAX, type SavedTemplate } from '@/entities/saved-template';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { ROUTE_NAMES } from '@/router/routes';
import { useActivityStore } from '@/stores/activity.store';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { useApplySavedTemplate } from '@/hooks/useApplySavedTemplate';
import { usePreviewActivity } from '@/hooks/usePreviewActivity';
import FitToBox from '@/shared/ui/FitToBox.vue';
import PageTopRow from '@/views/account-view/components/PageTopRow.vue';
import DeleteTemplateDialog from '@/views/account-view/components/DeleteTemplateDialog.vue';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';

/** Сохранённый шаблон: превью настоящей карточкой, редактирование, переименование, удаление. */
const props = defineProps<{ id: string }>();

const router = useRouter();
const activityStore = useActivityStore();
const savedTemplates = useSavedTemplatesStore();
const { editTemplate, applyToActivity } = useApplySavedTemplate();
const { activity: previewActivity, isDemo } = usePreviewActivity();

const template = ref<SavedTemplate | null>(null);
const loadError = ref<unknown>(null);
const isLoading = ref(true);

async function load() {
  isLoading.value = true;
  loadError.value = null;
  try {
    template.value = await savedTemplates.fetchOne(props.id);
  } catch (error) {
    loadError.value = error;
  } finally {
    isLoading.value = false;
  }
}
watch(() => props.id, load, { immediate: true });

// Список в сторе обновился (переименовали, сохранили из редактора) — показываем свежее.
watch(
  () => savedTemplates.byId.get(props.id),
  (fresh) => {
    if (fresh) template.value = fresh;
  },
);

const isNotFound = computed(
  () => isApiError(loadError.value) && loadError.value.code === 'NOT_FOUND',
);
const loadErrorMessage = computed(() =>
  isApiError(loadError.value) ? loadError.value.message : UNKNOWN_ERROR_MESSAGE,
);

const statValues = computed(() =>
  previewActivity.value ? getActivityShareStats(previewActivity.value) : null,
);

const meta = computed(() => {
  if (!template.value) return '';
  const date = new Date(template.value.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `Основа — «${getPhotoTemplateTitle(template.value.baseTemplate)}» · изменён ${date}`;
});

const hasOwnActivity = computed(() => Boolean(activityStore.activity));

function goBack() {
  if (typeof window.history.state?.back === 'string') router.back();
  else void router.replace({ name: ROUTE_NAMES.account });
}

const pendingAction = ref<'edit' | 'apply' | null>(null);

/** Редактор в режиме шаблона: правим сам шаблон (картинку там не сохранить). */
async function edit() {
  if (!template.value || pendingAction.value) return;
  pendingAction.value = 'edit';
  try {
    await editTemplate(template.value);
  } finally {
    pendingAction.value = null;
  }
}

/** Карточка своей тренировки по шаблону (без тренировки — сначала загрузка GPX). */
async function apply() {
  if (!template.value || pendingAction.value) return;
  pendingAction.value = 'apply';
  try {
    await applyToActivity(template.value);
  } finally {
    pendingAction.value = null;
  }
}

// Переименование
const isRenameOpen = ref(false);
const renameValue = ref('');
const renameError = ref('');
const isRenaming = ref(false);

function openRename() {
  renameValue.value = template.value?.name ?? '';
  renameError.value = '';
  isRenameOpen.value = true;
}

async function rename() {
  if (!template.value || isRenaming.value) return;
  const name = renameValue.value.trim();
  if (!name) {
    renameError.value = 'Укажите название';
    return;
  }
  isRenaming.value = true;
  try {
    template.value = await savedTemplates.update(template.value.id, { name });
    isRenameOpen.value = false;
  } catch (error) {
    renameError.value = isApiError(error)
      ? (error.fields.name ?? error.message)
      : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isRenaming.value = false;
  }
}

// Удаление — иконкой в верхней строке, с подтверждением.
const isDeleteOpen = ref(false);

function handleDeleted() {
  isDeleteOpen.value = false;
  void router.replace({ name: ROUTE_NAMES.account });
}
</script>

<template>
  <!-- Страница без прокрутки: превью карточки занимает всё свободное место и уменьшается. -->
  <div class="saved-template">
    <PageTopRow back-label="Назад к моим шаблонам" @back="goBack">
      <span class="saved-template__crumb">Мои шаблоны</span>
      <template v-if="template" #actions>
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          color="error"
          size="small"
          aria-label="Удалить шаблон"
          @click="isDeleteOpen = true"
        />
      </template>
    </PageTopRow>

    <div v-if="isLoading" class="saved-template__state">
      <v-progress-circular indeterminate />
    </div>

    <div v-else-if="loadError" class="saved-template__state">
      <p class="saved-template__state-title">
        {{ isNotFound ? 'Шаблон не найден' : 'Не удалось загрузить шаблон' }}
      </p>
      <p class="saved-template__state-text">
        {{ isNotFound ? 'Возможно, его удалили на другом устройстве.' : loadErrorMessage }}
      </p>
      <v-btn v-if="!isNotFound" variant="tonal" @click="load">Повторить</v-btn>
    </div>

    <template v-else-if="template">
      <div class="saved-template__heading">
        <h1 class="saved-template__name">{{ template.name }}</h1>
        <v-btn
          icon="mdi-pencil-outline"
          variant="text"
          size="small"
          aria-label="Переименовать"
          @click="openRename"
        />
      </div>
      <p class="saved-template__meta">{{ meta }}</p>

      <!-- Настоящая карточка: шаблон на своей тренировке или на демо-пробежке. Только просмотр. -->
      <div class="saved-template__preview" inert>
        <FitToBox v-if="previewActivity && statValues" :padding="0" class="saved-template__fit">
          <ShareCardArtwork
            :activity="previewActivity"
            :settings="template.settings"
            :stat-values="statValues"
            exporting
          />
        </FitToBox>
        <v-progress-circular v-else indeterminate class="saved-template__preview-loader" />
      </div>
      <p class="saved-template__hint">
        {{
          isDemo
            ? 'Показан на демо-пробежке.'
            : `Показан на вашей тренировке «${previewActivity?.name}».`
        }}
      </p>

      <div class="saved-template__actions">
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          block
          prepend-icon="mdi-image-plus-outline"
          :loading="pendingAction === 'apply'"
          :disabled="pendingAction === 'edit'"
          @click="apply"
        >
          {{ hasOwnActivity ? 'Создать карточку по шаблону' : 'Загрузить GPX и создать карточку' }}
        </v-btn>
        <v-btn
          variant="tonal"
          size="large"
          block
          prepend-icon="mdi-palette-outline"
          :loading="pendingAction === 'edit'"
          :disabled="pendingAction === 'apply'"
          @click="edit"
        >
          Редактировать шаблон
        </v-btn>
      </div>
    </template>

    <v-dialog v-model="isRenameOpen" max-width="380">
      <v-card class="saved-template-dialog">
        <form novalidate @submit.prevent="rename">
          <div class="saved-template-dialog__title">Переименовать шаблон</div>
          <v-text-field
            v-model="renameValue"
            label="Название"
            variant="outlined"
            density="comfortable"
            class="saved-template-dialog__field"
            :counter="SAVED_TEMPLATE_NAME_MAX"
            :maxlength="SAVED_TEMPLATE_NAME_MAX"
            :error-messages="renameError || undefined"
            :disabled="isRenaming"
            @update:model-value="renameError = ''"
          />
          <div class="saved-template-dialog__actions">
            <v-btn variant="tonal" @click="isRenameOpen = false">Отмена</v-btn>
            <v-btn type="submit" color="primary" variant="flat" :loading="isRenaming">
              Сохранить
            </v-btn>
          </div>
        </form>
      </v-card>
    </v-dialog>

    <DeleteTemplateDialog
      :template="isDeleteOpen ? template : null"
      @close="isDeleteOpen = false"
      @deleted="handleDeleted"
    />
  </div>
</template>

<style scoped>
.saved-template {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 600px;
  min-height: 0;
  margin: 0 auto;
  padding: 16px 16px max(16px, env(safe-area-inset-bottom));
  overflow: hidden;
}

.saved-template__crumb {
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 14px;
}

.saved-template__heading {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-bottom: -10px;
}

.saved-template__name {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.3;
}

.saved-template__meta {
  flex: 0 0 auto;
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 13px;
}

/* Карточка целиком, уменьшенная под область (как в редакторе). */
.saved-template__preview {
  position: relative;
  display: grid;
  flex: 1 1 0;
  min-height: 120px;
  place-items: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--app-on-surface) 4%, var(--app-background));
}

.saved-template__fit {
  width: 100%;
  height: 100%;
}

.saved-template__hint {
  flex: 0 0 auto;
  margin: -4px 0 0;
  color: color-mix(in srgb, var(--app-on-surface) 55%, transparent);
  font-size: 13px;
  text-align: center;
}

.saved-template__actions {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 10px;
}

.saved-template__actions :deep(.v-btn) {
  letter-spacing: 0;
  text-transform: none;
}

.saved-template__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 8px;
  text-align: center;
}

.saved-template__state-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.saved-template__state-text {
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
}

.saved-template-dialog {
  padding: 20px;
}

.saved-template-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.saved-template-dialog__field {
  margin-top: 16px;
}

.saved-template-dialog__field :deep(input) {
  font-size: 16px;
}

.saved-template-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.saved-template-dialog__actions > .v-btn {
  flex: 1 1 0;
  letter-spacing: 0;
  text-transform: none;
}
</style>
