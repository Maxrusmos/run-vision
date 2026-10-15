import type { ShareType } from '@/entities/activity/model/activity-share/activity-share.types';

export type ShareTypeOption = {
  value: ShareType;
  icon: string;
  title: string;
  description: string;
};

export const SHARE_TYPE_OPTIONS: readonly ShareTypeOption[] = [
  {
    value: 'photo',
    icon: 'mdi-image-outline',
    title: 'Фото',
    description: 'Статичный кадр тренировки',
  },
  {
    value: 'video',
    icon: 'mdi-movie-open-outline',
    title: 'Видео',
    description: 'Анимация прохождения маршрута',
  },
];
