import type {
  PhotoTemplateId,
  ShareCardSettings,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';

/** Сохранённый шаблон оформления (`SavedTemplate` в `docs/api.md`). */
export interface SavedTemplate {
  id: string;
  name: string;
  /** Шаблон приложения, от которого сделан: от него зависят карта, виджеты и т.п. */
  baseTemplate: PhotoTemplateId;
  /** Для чего шаблон: фото-карточка или видео. Не меняется. */
  shareType: ShareType;
  settings: ShareCardSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTemplateInput {
  name: string;
  baseTemplate: PhotoTemplateId;
  shareType: ShareType;
  settings: ShareCardSettings;
}

export const SAVED_TEMPLATE_NAME_MAX = 60;
