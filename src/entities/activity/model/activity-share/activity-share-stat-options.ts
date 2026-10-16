import type { ShareStatKey, ShareStatOption, ShareStatWidth } from './activity-share.types';

export const SHARE_STAT_OPTIONS: readonly ShareStatOption[] = [
  { key: 'distance', label: 'Дистанция', cardLabel: 'Дистанция' },
  { key: 'duration', label: 'Время в движении', cardLabel: 'Время' },
  { key: 'elapsedTime', label: 'Общее время (с остановками)', cardLabel: 'Общее время' },
  { key: 'averagePace', label: 'Средний темп', cardLabel: 'Средний темп' },
  { key: 'averageSpeed', label: 'Средняя скорость', cardLabel: 'Скорость' },
  { key: 'bestKm', label: 'Лучший километр', cardLabel: 'Лучший 1 км' },
  { key: 'best5k', label: 'Лучшие 5 км', cardLabel: 'Лучшие 5 км' },
  { key: 'averageHeartRate', label: 'Средний пульс', cardLabel: 'Средний пульс' },
  { key: 'maxHeartRate', label: 'Максимальный пульс', cardLabel: 'Макс. пульс' },
  { key: 'averageCadence', label: 'Каденс', cardLabel: 'Частота шагов' },
  { key: 'strideLength', label: 'Длина шага', cardLabel: 'Длина шага' },
  { key: 'elevationGain', label: 'Набор высоты', cardLabel: 'Набор высоты' },
  { key: 'elevationLoss', label: 'Сброс высоты', cardLabel: 'Сброс высоты' },
  { key: 'maxElevation', label: 'Максимальная высота', cardLabel: 'Макс. высота' },
  { key: 'startTime', label: 'Время старта', cardLabel: 'Старт' },
  { key: 'date', label: 'Дата', cardLabel: 'Дата' },
];

export const DEFAULT_VISIBLE_SHARE_STATS: readonly ShareStatKey[] = [
  'distance',
  'duration',
  'averagePace',
  'averageHeartRate',
];

export const DEFAULT_SHARE_STAT_WIDTH: ShareStatWidth = 'half';

export const SHARE_STAT_WIDTH_OPTIONS: readonly {
  value: ShareStatWidth;
  label: string;
  title: string;
}[] = [
  { value: 'third', label: '⅓', title: 'Треть ширины' },
  { value: 'half', label: '½', title: 'Половина ширины' },
  { value: 'full', label: '1', title: 'Вся ширина' },
];

export function getShareStatCardLabel(key: ShareStatKey): string {
  return SHARE_STAT_OPTIONS.find((option) => option.key === key)?.cardLabel ?? key;
}
