import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';

import type { IActivity } from '@/entities/activity/model/activity.types';
import { parseGpx } from '@/entities/activity/parser/gpx.parser';
import { loadDemoActivity } from '@/entities/activity/lib/demo-activity';
import { useShareDraftsStore } from '@/stores/share-drafts.store';

export const useActivityStore = defineStore('activity', () => {
  // Тренировка не меняется после импорта: без глубокой реактивности — иначе каждое
  // чтение десятков тысяч точек трека идёт через прокси Vue и редактор тормозит.
  const activity = shallowRef<IActivity | null>(null);
  /** Исходный GPX — по нему тренировка восстанавливается после перезагрузки страницы. */
  const sourceFile = shallowRef<File | null>(null);
  /** Вместо своей тренировки — демо-пробежка (открыли сохранённый шаблон без GPX). */
  const isDemo = ref(false);
  const isImporting = ref(false);
  const importError = ref<string | null>(null);

  function setActivity(value: IActivity) {
    activity.value = markRaw(value);
  }

  function clearActivity() {
    activity.value = null;
    sourceFile.value = null;
    isDemo.value = false;
  }

  /** Открыть демо-пробежку (своя тренировка не загружена). */
  async function useDemoActivity() {
    const demo = await loadDemoActivity();
    useShareDraftsStore().clear();
    setActivity(demo);
    sourceFile.value = null;
    isDemo.value = true;
  }

  /** Вернуть тренировку из сохранённого GPX (без сброса черновиков). */
  async function restoreFromFile(file: File): Promise<boolean> {
    try {
      setActivity(await parseGpx(file));
      sourceFile.value = file;
      isDemo.value = false;
      return true;
    } catch {
      return false;
    }
  }

  function clearImportError() {
    importError.value = null;
  }

  async function importGpx(file: File): Promise<boolean> {
    if (isImporting.value) return false;

    isImporting.value = true;
    importError.value = null;

    try {
      setActivity(await parseGpx(file));
      sourceFile.value = file;
      isDemo.value = false;
      // Новая тренировка — карточки начинаются заново.
      useShareDraftsStore().clear();
      return true;
    } catch (error) {
      importError.value =
        error instanceof Error ? error.message : 'Не удалось импортировать GPX файл';
      return false;
    } finally {
      isImporting.value = false;
    }
  }

  return {
    activity,
    sourceFile,
    isDemo,
    isImporting,
    importError,
    setActivity,
    clearActivity,
    clearImportError,
    importGpx,
    restoreFromFile,
    useDemoActivity,
  };
});
