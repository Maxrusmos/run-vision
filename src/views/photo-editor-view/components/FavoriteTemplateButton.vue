<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type {
  PhotoTemplateId,
  ShareCardSettings,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { getPhotoTemplateTitle } from '@/entities/activity/model/activity-share/photo-templates';
import { isSameTemplateSettings, SAVED_TEMPLATE_NAME_MAX } from '@/entities/saved-template';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { ROUTE_NAMES } from '@/router/routes';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';

/**
 * «Избранное» в редакторе (только для вошедших): сохраняет оформление карточки в
 * «Мои шаблоны». Карточка, открытая из сохранённого шаблона, обновляет его или
 * сохраняется как новый. Звезда закрашена, пока карточка совпадает с сохранённым шаблоном.
 */
const props = defineProps<{
  templateId: PhotoTemplateId;
  /** Фото или видео: шаблон сохраняется своего типа, связь — тоже своя. */
  shareType: ShareType;
  settings: ShareCardSettings;
}>();

const router = useRouter();
const savedTemplates = useSavedTemplatesStore();
const draftsStore = useShareDraftsStore();

const isDialogOpen = ref(false);
const name = ref('');
const nameError = ref('');
const formError = ref('');
const pendingAction = ref<'create' | 'update' | null>(null);
const savedMessage = ref('');
const isSnackbarOpen = ref(false);

onMounted(() => void savedTemplates.ensureLoaded());

/** Сохранённый шаблон, из которого открыта карточка (если он ещё существует). */
const linked = computed(() => {
  const id = draftsStore.getLink(props.shareType, props.templateId);
  return id ? (savedTemplates.byId.get(id) ?? null) : null;
});

const isSaved = computed(
  () => linked.value !== null && isSameTemplateSettings(linked.value.settings, props.settings),
);

function defaultName() {
  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const kind = props.shareType === 'video' ? ' · видео' : '';
  return `${getPhotoTemplateTitle(props.templateId)}${kind} · ${date}`;
}

function open() {
  name.value = linked.value?.name ?? defaultName();
  nameError.value = '';
  formError.value = '';
  isDialogOpen.value = true;
}

watch(name, () => {
  nameError.value = '';
  formError.value = '';
});

function validateName(): string | null {
  const value = name.value.trim();
  if (!value) {
    nameError.value = 'Укажите название';
    return null;
  }
  if (value.length > SAVED_TEMPLATE_NAME_MAX) {
    nameError.value = `Не длиннее ${SAVED_TEMPLATE_NAME_MAX} символов`;
    return null;
  }
  return value;
}

async function submit(action: 'create' | 'update') {
  if (pendingAction.value) return;
  const value = validateName();
  if (!value) return;

  pendingAction.value = action;
  try {
    const template =
      action === 'update' && linked.value
        ? await savedTemplates.update(linked.value.id, { name: value, settings: props.settings })
        : await savedTemplates.create(value, props.templateId, props.shareType, props.settings);
    // Дальше эта карточка — копия сохранённого шаблона: звезда следит за ним.
    draftsStore.setLink(props.shareType, props.templateId, template.id);
    isDialogOpen.value = false;
    savedMessage.value =
      action === 'update' ? `Шаблон «${template.name}» обновлён` : `Сохранено в «Мои шаблоны»`;
    isSnackbarOpen.value = true;
  } catch (error) {
    if (isApiError(error) && error.fields.name) nameError.value = error.fields.name;
    else formError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    pendingAction.value = null;
  }
}

function openAccount() {
  isSnackbarOpen.value = false;
  void router.push({ name: ROUTE_NAMES.account });
}
</script>

<template>
  <button
    type="button"
    class="history-actions__button favorite-button"
    :class="{ 'favorite-button--saved': isSaved }"
    :aria-label="isSaved ? 'Шаблон сохранён в «Мои шаблоны»' : 'Сохранить в «Мои шаблоны»'"
    :aria-pressed="isSaved"
    :title="isSaved ? 'Сохранено в «Мои шаблоны»' : 'Сохранить в «Мои шаблоны»'"
    @click="open"
  >
    <v-icon :icon="isSaved ? 'mdi-star' : 'mdi-star-outline'" size="20" />
  </button>

  <v-dialog v-model="isDialogOpen" max-width="380">
    <v-card class="favorite-dialog">
      <form novalidate @submit.prevent="submit(linked ? 'update' : 'create')">
        <div class="favorite-dialog__title">
          {{ linked ? 'Сохранённый шаблон' : 'Сохранить в «Мои шаблоны»' }}
        </div>
        <div class="favorite-dialog__text">
          <template v-if="!linked">
            Оформление {{ shareType === 'video' ? 'видео' : 'карточки' }} сохранится в аккаунте —
            его можно применить к любой тренировке. Фото фона и текст названия не сохраняются.
          </template>
          <template v-else-if="isSaved">Изменений нет — шаблон совпадает с карточкой.</template>
          <template v-else>Обновить шаблон этой карточкой или сохранить её как новый?</template>
        </div>

        <v-text-field
          v-model="name"
          label="Название"
          variant="outlined"
          density="comfortable"
          class="favorite-dialog__field"
          :counter="SAVED_TEMPLATE_NAME_MAX"
          :maxlength="SAVED_TEMPLATE_NAME_MAX"
          :error-messages="nameError || undefined"
          :disabled="pendingAction !== null"
        />

        <v-alert
          v-if="formError"
          type="error"
          variant="tonal"
          density="compact"
          class="favorite-dialog__alert"
        >
          {{ formError }}
        </v-alert>

        <div class="favorite-dialog__actions">
          <template v-if="linked">
            <v-btn
              variant="tonal"
              :loading="pendingAction === 'create'"
              :disabled="pendingAction === 'update'"
              @click="submit('create')"
            >
              Как новый
            </v-btn>
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              :loading="pendingAction === 'update'"
              :disabled="pendingAction === 'create'"
            >
              Обновить
            </v-btn>
          </template>
          <template v-else>
            <v-btn variant="tonal" @click="isDialogOpen = false">Отмена</v-btn>
            <v-btn type="submit" color="primary" variant="flat" :loading="pendingAction !== null">
              Сохранить
            </v-btn>
          </template>
        </div>
      </form>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="isSnackbarOpen"
    timeout="3500"
    location="top"
    content-class="favorite-snackbar"
  >
    {{ savedMessage }}
    <template #actions>
      <v-btn variant="text" color="primary" @click="openAccount">Мои шаблоны</v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
.favorite-button--saved {
  color: var(--app-primary) !important;
}

.favorite-dialog {
  padding: 20px;
}

.favorite-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.favorite-dialog__text {
  margin-top: 8px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.45;
}

.favorite-dialog__field {
  margin-top: 16px;
}

/* iOS приближает страницу, если шрифт поля меньше 16px. */
.favorite-dialog__field :deep(input) {
  font-size: 16px;
}

.favorite-dialog__alert {
  margin-top: 4px;
}

.favorite-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.favorite-dialog__actions > .v-btn {
  flex: 1 1 0;
  letter-spacing: 0;
  text-transform: none;
}
</style>

<style>
/* Уведомление — под шапкой редактора, а не поверх кнопок «назад» и «Сохранить». */
.favorite-snackbar {
  margin-top: calc(env(safe-area-inset-top) + 64px) !important;
}
</style>
