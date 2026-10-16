import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';

import type { IActivity } from '@/entities/activity/model/activity.types';
import { parseGpx } from '@/entities/activity/parser/gpx.parser';

export const useActivityStore = defineStore('activity', () => {
  // Тренировка не меняется после импорта: без глубокой реактивности — иначе каждое
  // чтение десятков тысяч точек трека идёт через прокси Vue и редактор тормозит.
  const activity = shallowRef<IActivity | null>(null);
  const isImporting = ref(false);
  const importError = ref<string | null>(null);

  function setActivity(value: IActivity) {
    activity.value = markRaw(value);
  }

  function clearActivity() {
    activity.value = null;
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
    isImporting,
    importError,
    setActivity,
    clearActivity,
    clearImportError,
    importGpx,
  };
});
