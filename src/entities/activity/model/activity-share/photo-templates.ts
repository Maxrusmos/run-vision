import { DEFAULT_SHARE_PRESET_ID } from './activity-share-presets';
import type { PhotoTemplate, PhotoTemplateId } from './activity-share.types';

export const PHOTO_TEMPLATES: readonly PhotoTemplate[] = [
  {
    id: 'minimal',
    title: 'Минимализм',
    description: 'Маршрут и главные цифры',
    presetId: 'sunset',
  },
  {
    id: 'topographic',
    title: 'Топография',
    description: 'Карта и рельеф',
    presetId: 'neon',
  },
  {
    id: 'telemetry',
    title: 'Телеметрия',
    description: 'Сплиты, пульс, графики',
    presetId: 'sun',
  },
];

export function getPhotoTemplatePresetId(id: PhotoTemplateId): string {
  return (
    PHOTO_TEMPLATES.find((template) => template.id === id)?.presetId ?? DEFAULT_SHARE_PRESET_ID
  );
}

export function getPhotoTemplateTitle(id: PhotoTemplateId): string {
  return PHOTO_TEMPLATES.find((template) => template.id === id)?.title ?? id;
}

/** Стили, которые уже есть в видео (остальные — «скоро»). */
export const VIDEO_TEMPLATE_IDS: readonly PhotoTemplateId[] = [
  'minimal',
  'topographic',
  'telemetry',
];

export function isVideoTemplateAvailable(id: PhotoTemplateId): boolean {
  return VIDEO_TEMPLATE_IDS.includes(id);
}
