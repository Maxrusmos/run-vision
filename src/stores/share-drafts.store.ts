import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import type {
  PhotoTemplateId,
  ShareCardSettings,
} from '@/entities/activity/model/activity-share/activity-share.types';

export type ShareDrafts = Partial<Record<PhotoTemplateId, ShareCardSettings>>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Черновики карточек текущей тренировки — по одному на шаблон. Вышел из редактора
 * в выбор стиля и вернулся — карточка такая же, как была; превью в карусели — по ним.
 * Фото фона в черновике — object URL. Пока открыт редактор, URL освобождает он
 * (кроме текущего — его забирает черновик); черновики освобождают свои при `clear`.
 */
export const useShareDraftsStore = defineStore('share-drafts', () => {
  const drafts = shallowRef<ShareDrafts>({});

  function getDraft(templateId: PhotoTemplateId): ShareCardSettings | null {
    const draft = drafts.value[templateId];
    return draft ? clone(draft) : null;
  }

  /** Сохранить черновик шаблона; `null` — карточка как по умолчанию, черновика нет. */
  function saveDraft(templateId: PhotoTemplateId, settings: ShareCardSettings | null) {
    const next = { ...drafts.value };
    if (settings) next[templateId] = clone(settings);
    else delete next[templateId];
    drafts.value = next;
  }

  /** Заменить все черновики (восстановление после перезагрузки). */
  function setDrafts(value: ShareDrafts) {
    clear();
    drafts.value = clone(value);
  }

  /** Новая тренировка — старые черновики не нужны. */
  function clear() {
    for (const draft of Object.values(drafts.value)) {
      if (draft?.backgroundImage) URL.revokeObjectURL(draft.backgroundImage);
    }
    drafts.value = {};
  }

  return { drafts, getDraft, saveDraft, setDrafts, clear };
});
