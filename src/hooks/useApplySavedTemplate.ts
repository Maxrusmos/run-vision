import { useRouter } from 'vue-router';
import type { SavedTemplate } from '@/entities/saved-template';
import { ROUTE_NAMES } from '@/router/routes';
import { useActivityStore } from '@/stores/activity.store';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';
import { useShareStore } from '@/stores/share.store';

/**
 * Сохранённый шаблон из кабинета:
 * - `editTemplate` — редактор в режиме шаблона (`?template=<id>`): правится сам шаблон,
 *   на своей тренировке или демо-пробежке, картинку не сохранить;
 * - `applyToActivity` — карточка своей тренировки по шаблону: шаблон становится черновиком
 *   своей основы (звезда в редакторе обновит шаблон). Тренировки нет — сначала загрузка GPX.
 */
export function useApplySavedTemplate() {
  const router = useRouter();
  const activityStore = useActivityStore();
  const draftsStore = useShareDraftsStore();
  const shareStore = useShareStore();
  const savedTemplates = useSavedTemplatesStore();

  function editTemplate(template: SavedTemplate) {
    return router.push({ name: ROUTE_NAMES.photoEditor, query: { template: template.id } });
  }

  async function openForActivity(template: SavedTemplate) {
    draftsStore.saveDraft(template.baseTemplate, template.settings);
    draftsStore.setLink(template.baseTemplate, template.id);
    shareStore.setShareType('photo');
    shareStore.setPhotoTemplate(template.baseTemplate);
    await router.push({ name: ROUTE_NAMES.photoEditor });
  }

  async function applyToActivity(template: SavedTemplate) {
    if (activityStore.activity) return openForActivity(template);
    // Своей тренировки нет: после загрузки GPX шаблон откроется сразу (openPendingAfterImport).
    savedTemplates.pendingTemplateId = template.id;
    await router.push({ name: ROUTE_NAMES.import });
  }

  /** Сразу после загрузки GPX: если из кабинета просили применить шаблон — применить. */
  async function openPendingAfterImport(): Promise<boolean> {
    const id = savedTemplates.pendingTemplateId;
    if (!id) return false;
    savedTemplates.pendingTemplateId = null;

    const template = savedTemplates.byId.get(id);
    if (!template || !activityStore.activity) return false;
    await openForActivity(template);
    return true;
  }

  return { editTemplate, applyToActivity, openPendingAfterImport };
}
