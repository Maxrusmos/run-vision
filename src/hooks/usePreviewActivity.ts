import { computed, onMounted, shallowRef } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import { loadDemoActivity } from '@/entities/activity/lib/demo-activity';
import { useActivityStore } from '@/stores/activity.store';

/**
 * Тренировка для превью сохранённых шаблонов: загруженная пользователем, а без неё —
 * демо-пробежка (собирается при первом показе).
 */
export function usePreviewActivity() {
  const activityStore = useActivityStore();
  const demo = shallowRef<IActivity | null>(null);

  onMounted(async () => {
    if (activityStore.activity) return;
    try {
      demo.value = await loadDemoActivity();
    } catch {
      // Без демо превью останется пустым — сами шаблоны доступны.
    }
  });

  const activity = computed(() => activityStore.activity ?? demo.value);
  /** Показано на демо-пробежке (своей тренировки нет). */
  const isDemo = computed(() => !activityStore.activity);

  return { activity, isDemo };
}
