import { useRouter } from 'vue-router';
import type { SavedTemplate } from '@/entities/saved-template';
import { getTemplateEditorRoute } from '@/router/routes';
import { useActivityStore } from '@/stores/activity.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';
import { useShareStore } from '@/stores/share.store';

/**
 * Сохранённый шаблон из кабинета (фото или видео — логика одна, редактор свой):
 * - `editTemplate` — редактор в режиме шаблона (`?template=<id>`): правится сам шаблон,
 *   на своей тренировке или демо-пробежке, картинку и видео не сохранить;
 * - `applyToActivity` — карточка (видео) своей тренировки по шаблону: шаблон становится
 *   черновиком своей основы (звезда в редакторе обновит шаблон). Нужна загруженная
 *   тренировка: без неё страница шаблона сначала сама выбирает GPX.
 */
export function useApplySavedTemplate() {
  const router = useRouter();
  const activityStore = useActivityStore();
  const draftsStore = useShareDraftsStore();
  const shareStore = useShareStore();

  function editTemplate(template: SavedTemplate) {
    return router.push({
      name: getTemplateEditorRoute(template.shareType),
      query: { template: template.id },
    });
  }

  async function applyToActivity(template: SavedTemplate) {
    if (!activityStore.activity) return;
    draftsStore.saveDraft(template.shareType, template.baseTemplate, template.settings);
    draftsStore.setLink(template.shareType, template.baseTemplate, template.id);
    shareStore.setShareType(template.shareType);
    if (template.shareType === 'video') shareStore.setVideoTemplate(template.baseTemplate);
    else shareStore.setPhotoTemplate(template.baseTemplate);
    await router.push({ name: getTemplateEditorRoute(template.shareType) });
  }

  return { editTemplate, applyToActivity };
}
