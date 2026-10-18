import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import type {
  PhotoTemplateId,
  ShareCardSettings,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';

/**
 * Черновики по ключу `тип:шаблон` (`photo:minimal`, `video:minimal`): у фото и видео свои —
 * правки фото-«Минимализма» не попадают в видео (и в превью видео в карусели). Раньше
 * черновик был общий, ключ — только шаблон (`minimal`); такие ключи — фото.
 */
export type ShareDrafts = Partial<Record<string, ShareCardSettings>>;
/**
 * Из какого сохранённого шаблона («Мои шаблоны») открыт черновик: `тип:шаблон` → id.
 * Звезда фото-редактора не должна обновлять видео-шаблон. Ключи без типа — фото.
 */
export type ShareDraftLinks = Partial<Record<string, string>>;

function draftKey(shareType: ShareType, templateId: PhotoTemplateId): string {
  return `${shareType}:${templateId}`;
}

/** Старые ключи (`topographic`) — фото. */
function normalizeKeys<T>(value: Partial<Record<string, T>>): Partial<Record<string, T>> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.includes(':') ? key : `photo:${key}`, item]),
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Черновики карточек текущей тренировки — по одному на шаблон в фото и в видео. Вышел из редактора
 * в выбор стиля и вернулся — карточка такая же, как была; превью в карусели — по ним.
 * Фото фона в черновике — object URL. Пока открыт редактор, URL освобождает он
 * (кроме текущего — его забирает черновик); черновики освобождают свои при `clear`.
 */
export const useShareDraftsStore = defineStore('share-drafts', () => {
  const drafts = shallowRef<ShareDrafts>({});
  const links = shallowRef<ShareDraftLinks>({});

  function getDraft(shareType: ShareType, templateId: PhotoTemplateId): ShareCardSettings | null {
    const draft = drafts.value[draftKey(shareType, templateId)];
    return draft ? clone(draft) : null;
  }

  /** Черновик без копии — только читать (превью в карусели). */
  function peekDraft(shareType: ShareType, templateId: PhotoTemplateId) {
    return drafts.value[draftKey(shareType, templateId)] ?? null;
  }

  /** Сохранить черновик шаблона; `null` — карточка как по умолчанию, черновика нет. */
  function saveDraft(
    shareType: ShareType,
    templateId: PhotoTemplateId,
    settings: ShareCardSettings | null,
  ) {
    const next = { ...drafts.value };
    const key = draftKey(shareType, templateId);
    if (settings) next[key] = clone(settings);
    else delete next[key];
    drafts.value = next;
  }

  /** Связать черновик с сохранённым шаблоном своего типа (или отвязать — `null`). */
  function setLink(
    shareType: ShareType,
    templateId: PhotoTemplateId,
    savedTemplateId: string | null,
  ) {
    const next = { ...links.value };
    const key = draftKey(shareType, templateId);
    if (savedTemplateId) next[key] = savedTemplateId;
    else delete next[key];
    links.value = next;
  }

  /** Сохранённый шаблон, из которого открыт черновик в фото или видео-редакторе. */
  function getLink(shareType: ShareType, templateId: PhotoTemplateId): string | null {
    return links.value[draftKey(shareType, templateId)] ?? null;
  }

  /** Заменить все черновики (восстановление после перезагрузки). */
  function setDrafts(value: ShareDrafts, valueLinks: ShareDraftLinks = {}) {
    clear();
    drafts.value = normalizeKeys(clone(value));
    links.value = normalizeKeys(valueLinks);
  }

  /** Новая тренировка — старые черновики не нужны. */
  function clear() {
    for (const draft of Object.values(drafts.value)) {
      if (draft?.backgroundImage) URL.revokeObjectURL(draft.backgroundImage);
      if (draft?.videoDot?.photo) URL.revokeObjectURL(draft.videoDot.photo);
    }
    drafts.value = {};
    links.value = {};
  }

  return { drafts, links, getDraft, peekDraft, saveDraft, setLink, getLink, setDrafts, clear };
});
