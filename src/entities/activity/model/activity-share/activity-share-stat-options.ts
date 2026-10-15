import type { ShareStatKey, ShareStatOption } from './activity-share.types';

export const SHARE_STAT_OPTIONS: readonly ShareStatOption[] = [
  { key: 'distance', label: 'Дистанция', cardLabel: 'Дистанция' },
  { key: 'duration', label: 'Время', cardLabel: 'Время' },
  { key: 'averagePace', label: 'Средний темп', cardLabel: 'Средний темп' },
  { key: 'averageHeartRate', label: 'Средний пульс', cardLabel: 'Средний пульс' },
  { key: 'maxHeartRate', label: 'Максимальный пульс', cardLabel: 'Макс. пульс' },
  { key: 'averageCadence', label: 'Каденс', cardLabel: 'Частота шагов' },
  { key: 'elevationGain', label: 'Набор высоты', cardLabel: 'Набор высоты' },
];

export const DEFAULT_VISIBLE_SHARE_STATS: readonly ShareStatKey[] = [
  'distance',
  'duration',
  'averagePace',
  'averageHeartRate',
];

export function getShareStatCardLabel(key: ShareStatKey): string {
  return SHARE_STAT_OPTIONS.find((option) => option.key === key)?.cardLabel ?? key;
}
