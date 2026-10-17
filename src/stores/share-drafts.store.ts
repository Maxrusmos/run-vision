import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import type {
  PhotoTemplateId,
  ShareCardSettings,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';

export type ShareDrafts = Partial<Record<PhotoTemplateId, ShareCardSettings>>;
/**
 * Из какого сохранённого шаблона («Мои шаблоны») открыт черновик: `тип:шаблон` → id.
 * Черновик у фото и видео общий, а шаблоны — свои у каждого: звезда фото-редактора не
 * должна обновлять видео-шаблон. Ключи без типа (сессии до видео-шаблонов) — фото.
 */
export type ShareDraftLinks = Partial<Record<string, string>>;

function linkKey(shareType: ShareType, templateId: PhotoTemplateId): string {
  return `${shareType}:${templateId}`;
}

/** Старые ключи (`topographic`) — связи фото-шаблонов. */
function normalizeLinks(value: ShareDraftLinks): ShareDraftLinks {
  return Object.fromEntries(
    Object.entries(value).map(([key, id]) => [key.includes(':') ? key : `photo:${key}`, id]),
  );
}

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
  const links = shallowRef<ShareDraftLinks>({});

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

  /** Связать черновик с сохранённым шаблоном своего типа (или отвязать — `null`). */
  function setLink(
    shareType: ShareType,
    templateId: PhotoTemplateId,
    savedTemplateId: string | null,
  ) {
    const next = { ...links.value };
    const key = linkKey(shareType, templateId);
    if (savedTemplateId) next[key] = savedTemplateId;
    else delete next[key];
    links.value = next;
  }

  /** Сохранённый шаблон, из которого открыт черновик в фото или видео-редакторе. */
  function getLink(shareType: ShareType, templateId: PhotoTemplateId): string | null {
    return links.value[linkKey(shareType, templateId)] ?? null;
  }

  /** Заменить все черновики (восстановление после перезагрузки). */
  function setDrafts(value: ShareDrafts, valueLinks: ShareDraftLinks = {}) {
    clear();
    drafts.value = clone(value);
    links.value = normalizeLinks(valueLinks);
  }

  /** Новая тренировка — старые черновики не нужны. */
  function clear() {
    for (const draft of Object.values(drafts.value)) {
      if (draft?.backgroundImage) URL.revokeObjectURL(draft.backgroundImage);
    }
    drafts.value = {};
    links.value = {};
  }

  return { drafts, links, getDraft, saveDraft, setLink, getLink, setDrafts, clear };
});
