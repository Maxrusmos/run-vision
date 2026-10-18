import type { ShareType } from '@/entities/activity/model/activity-share/activity-share.types';

export const ROUTE_NAMES = {
  import: 'import',
  share: 'share',
  photoEditor: 'photo-editor',
  videoEditor: 'video-editor',
  account: 'account',
  savedTemplate: 'saved-template',
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
  resetPassword: 'reset-password',
  privacy: 'privacy',
  consent: 'consent',
  pro: 'pro',
  proMockCheckout: 'pro-mock-checkout',
  proReturn: 'pro-return',
} as const;

/** Редактор для шаблона «Моих шаблонов»: фото-шаблон — в фото-редакторе, видео — в видео. */
export function getTemplateEditorRoute(shareType: ShareType) {
  return shareType === 'video' ? ROUTE_NAMES.videoEditor : ROUTE_NAMES.photoEditor;
}
