import { DEFAULT_SHARE_PRESET_ID } from './activity-share-presets';
import type { PhotoTemplate, PhotoTemplateId } from './activity-share.types';

export const PHOTO_TEMPLATES: readonly PhotoTemplate[] = [
  {
    id: 'minimal',
    title: 'Минимализм',
    description: 'Маршрут и главные цифры',
    presetId: 'night',
  },
  {
    id: 'topographic',
    title: 'Топография',
    description: 'Карта и рельеф',
    presetId: 'forest',
  },
];

export function getPhotoTemplatePresetId(id: PhotoTemplateId): string {
  return (
    PHOTO_TEMPLATES.find((template) => template.id === id)?.presetId ?? DEFAULT_SHARE_PRESET_ID
  );
}
