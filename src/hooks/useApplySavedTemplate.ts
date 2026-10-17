import { useRouter } from 'vue-router';
import type { SavedTemplate } from '@/entities/saved-template';
import { ROUTE_NAMES } from '@/router/routes';
import { useActivityStore } from '@/stores/activity.store';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { useShareDraftsStore } from '@/stores/share-drafts.store';
import { useShareStore } from '@/stores/share.store';

/**
 * Открыть сохранённый шаблон в редакторе: он становится черновиком своего шаблона
 * приложения (и связан с сохранённым — звезда в редакторе обновит его).
 */
export function useApplySavedTemplate() {
  const router = useRouter();
  const activityStore = useActivityStore();
  const draftsStore = useShareDraftsStore();
  const shareStore = useShareStore();
  const savedTemplates = useSavedTemplatesStore();

  /** Своя тренировка не загружена — открываем на демо-пробежке. */
  async function openInEditor(template: SavedTemplate) {
    if (!activityStore.activity) await activityStore.useDemoActivity();

    draftsStore.saveDraft(template.baseTemplate, template.settings);
    draftsStore.setLink(template.baseTemplate, template.id);
    shareStore.setShareType('photo');
    shareStore.setPhotoTemplate(template.baseTemplate);
    await router.push({ name: ROUTE_NAMES.photoEditor });
  }

  /** Сразу после загрузки GPX: если из кабинета просили применить шаблон — применить. */
  async function openPendingAfterImport(): Promise<boolean> {
    const id = savedTemplates.pendingTemplateId;
    if (!id) return false;
    savedTemplates.pendingTemplateId = null;

    const template = savedTemplates.byId.get(id);
    if (!template) return false;
    await openInEditor(template);
    return true;
  }

  return { openInEditor, openPendingAfterImport };
}
