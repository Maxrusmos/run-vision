import { useRouter } from 'vue-router';
import type { SavedTemplate } from '@/entities/saved-template';
import { ROUTE_NAMES } from '@/router/routes';
import { useActivityStore } from '@/stores/activity.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';
import { useShareStore } from '@/stores/share.store';

/**
 * Сохранённый шаблон из кабинета:
 * - `editTemplate` — редактор в режиме шаблона (`?template=<id>`): правится сам шаблон,
 *   на своей тренировке или демо-пробежке, картинку не сохранить;
 * - `applyToActivity` — карточка своей тренировки по шаблону: шаблон становится черновиком
 *   своей основы (звезда в редакторе обновит шаблон). Нужна загруженная тренировка: без неё
 *   страница шаблона сначала сама выбирает GPX.
 */
export function useApplySavedTemplate() {
  const router = useRouter();
  const activityStore = useActivityStore();
  const draftsStore = useShareDraftsStore();
  const shareStore = useShareStore();

  function editTemplate(template: SavedTemplate) {
    return router.push({ name: ROUTE_NAMES.photoEditor, query: { template: template.id } });
  }

  async function applyToActivity(template: SavedTemplate) {
    if (!activityStore.activity) return;
    draftsStore.saveDraft(template.baseTemplate, template.settings);
    draftsStore.setLink(template.baseTemplate, template.id);
    shareStore.setShareType('photo');
    shareStore.setPhotoTemplate(template.baseTemplate);
    await router.push({ name: ROUTE_NAMES.photoEditor });
  }

  return { editTemplate, applyToActivity };
}
