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
import StepPage from '@/shared/ui/StepPage.vue';
import ShareCardArtwork from '@/views/photo-editor-view/components/artwork/ShareCardArtwork.vue';

/** Сохранённый шаблон: превью настоящей карточкой, редактирование, переименование, удаление. */
const props = defineProps<{ id: string }>();

const router = useRouter();
const activityStore = useActivityStore();
const savedTemplates = useSavedTemplatesStore();
const { openInEditor } = useApplySavedTemplate();
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
    month: 'long',
    year: 'numeric',
  });
  return `Основа — «${getPhotoTemplateTitle(template.value.baseTemplate)}» · изменён ${date}`;
});

const hasOwnActivity = computed(() => Boolean(activityStore.activity) && !activityStore.isDemo);

function goBack() {
  if (typeof window.history.state?.back === 'string') router.back();
  else void router.replace({ name: ROUTE_NAMES.account });
}

const isOpening = ref(false);
async function edit() {
  if (!template.value || isOpening.value) return;
  isOpening.value = true;
  try {
    await openInEditor(template.value);
  } finally {
    isOpening.value = false;
  }
}

/** Своей тренировки нет: загрузить GPX — и шаблон сразу откроется на ней. */
function applyToOwnActivity() {
  if (!template.value) return;
  savedTemplates.pendingTemplateId = template.value.id;
  void router.push({ name: ROUTE_NAMES.import });
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

// Удаление
const isDeleteOpen = ref(false);
const deleteError = ref('');
const isDeleting = ref(false);

async function remove() {
  if (!template.value || isDeleting.value) return;
  isDeleting.value = true;
  deleteError.value = '';
  try {
    await savedTemplates.remove(template.value.id);
    isDeleteOpen.value = false;
    void router.replace({ name: ROUTE_NAMES.account });
  } catch (error) {
    deleteError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <StepPage max-width="600px">
    <div class="saved-template__top">
      <button
        type="button"
        class="saved-template__back"
        aria-label="Назад к моим шаблонам"
        @click="goBack"
      >
        <v-icon icon="mdi-arrow-left" size="22" />
      </button>
      <span class="saved-template__crumb">Мои шаблоны</span>
    </div>

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
        <v-btn color="primary" variant="flat" size="large" block :loading="isOpening" @click="edit">
          {{ hasOwnActivity ? 'Открыть на своей тренировке' : 'Открыть в редакторе' }}
        </v-btn>
        <v-btn
          v-if="!hasOwnActivity"
          variant="tonal"
          size="large"
          block
          prepend-icon="mdi-upload"
          @click="applyToOwnActivity"
        >
          Применить к своей тренировке
        </v-btn>
        <v-btn
          variant="text"
          color="error"
          block
          prepend-icon="mdi-delete-outline"
          @click="isDeleteOpen = true"
        >
          Удалить шаблон
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

    <v-dialog v-model="isDeleteOpen" max-width="360">
      <v-card class="saved-template-dialog">
        <div class="saved-template-dialog__title">Удалить шаблон?</div>
        <div class="saved-template-dialog__text">
          «{{ template?.name }}» пропадёт из «Моих шаблонов» на всех устройствах. Карточки, которые
          вы уже сохранили картинкой, не изменятся.
        </div>
        <v-alert
          v-if="deleteError"
          type="error"
          variant="tonal"
          density="compact"
          class="saved-template-dialog__alert"
        >
          {{ deleteError }}
        </v-alert>
        <div class="saved-template-dialog__actions">
          <v-btn variant="tonal" @click="isDeleteOpen = false">Отмена</v-btn>
          <v-btn color="error" variant="flat" :loading="isDeleting" @click="remove">Удалить</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </StepPage>
</template>

<style scoped>
.saved-template__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: -8px;
}

.saved-template__back {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  color: var(--app-on-surface);
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--app-on-surface) 10%, transparent);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.saved-template__crumb {
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 14px;
}

.saved-template__heading {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-bottom: -16px;
}

.saved-template__name {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}

.saved-template__meta {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 13px;
}

/* Карточка целиком, уменьшенная под область (как в редакторе). */
.saved-template__preview {
  position: relative;
  display: grid;
  height: min(52dvh, 520px);
  place-items: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--app-on-surface) 4%, var(--app-background));
}

.saved-template__fit {
  width: 100%;
  height: 100%;
}

.saved-template__hint {
  margin: -8px 0 0;
  color: color-mix(in srgb, var(--app-on-surface) 55%, transparent);
  font-size: 13px;
  text-align: center;
}

.saved-template__actions {
  display: flex;
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

.saved-template-dialog__text {
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.45;
}

.saved-template-dialog__field {
  margin-top: 16px;
}

.saved-template-dialog__field :deep(input) {
  font-size: 16px;
}

.saved-template-dialog__alert {
  margin-top: 12px;
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
