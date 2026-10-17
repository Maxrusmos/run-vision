import { defineStore } from 'pinia';
import { computed, ref, shallowRef, watch } from 'vue';

import type {
  PhotoTemplateId,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import {
  savedTemplatesApi,
  toTemplateSettings,
  type SavedTemplate,
} from '@/entities/saved-template';
import { useAuthStore } from '@/stores/auth.store';

export type SavedTemplatesStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Сохранённые шаблоны вошедшего пользователя («Мои шаблоны»). Список грузится по
 * требованию и обновляется локально после каждого изменения; при выходе — очищается.
 */
export const useSavedTemplatesStore = defineStore('saved-templates', () => {
  const authStore = useAuthStore();

  const templates = shallowRef<SavedTemplate[]>([]);
  const status = ref<SavedTemplatesStatus>('idle');
  const error = ref<unknown>(null);

  const byId = computed(() => new Map(templates.value.map((item) => [item.id, item])));

  let loadPromise: Promise<void> | null = null;

  function sortByUpdated(list: SavedTemplate[]) {
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function upsert(template: SavedTemplate) {
    templates.value = sortByUpdated([
      template,
      ...templates.value.filter((item) => item.id !== template.id),
    ]);
  }

  /** Загрузить список (повторные вызовы во время загрузки ждут её). */
  function load(): Promise<void> {
    loadPromise ??= (async () => {
      status.value = 'loading';
      error.value = null;
      try {
        templates.value = sortByUpdated(await savedTemplatesApi.list());
        status.value = 'ready';
      } catch (loadError) {
        error.value = loadError;
        status.value = 'error';
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  }

  /** Список нужен, но ещё не загружен — загрузить. */
  function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') return load();
    return loadPromise ?? Promise.resolve();
  }

  /** Шаблон по id: из списка или с сервера (бросает ApiError, например NOT_FOUND). */
  async function fetchOne(id: string): Promise<SavedTemplate> {
    const known = byId.value.get(id);
    if (known) return known;
    const template = await savedTemplatesApi.get(id);
    upsert(template);
    return template;
  }

  async function create(
    name: string,
    baseTemplate: PhotoTemplateId,
    shareType: ShareType,
    settings: ShareCardSettings,
  ) {
    const template = await savedTemplatesApi.create({
      name,
      baseTemplate,
      shareType,
      settings: toTemplateSettings(settings),
    });
    upsert(template);
    return template;
  }

  async function update(id: string, patch: { name?: string; settings?: ShareCardSettings }) {
    const template = await savedTemplatesApi.update(id, {
      ...patch,
      ...(patch.settings ? { settings: toTemplateSettings(patch.settings) } : {}),
    });
    upsert(template);
    return template;
  }

  async function remove(id: string) {
    await savedTemplatesApi.remove(id);
    templates.value = templates.value.filter((item) => item.id !== id);
  }

  function reset() {
    templates.value = [];
    status.value = 'idle';
    error.value = null;
  }

  // Другой пользователь (или выход) — чужие шаблоны не показываем.
  watch(
    () => authStore.user?.id ?? null,
    (userId, previous) => {
      if (userId !== previous) reset();
    },
  );

  return {
    templates,
    status,
    error,
    byId,
    load,
    ensureLoaded,
    fetchOne,
    create,
    update,
    remove,
    reset,
  };
});
