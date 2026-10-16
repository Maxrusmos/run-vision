import type { ShareStatStyle, ShareStatWidth } from './activity-share.types';

export type ShareStatStyleOption = {
  id: ShareStatStyle;
  name: string;
};

export const DEFAULT_STAT_STYLE: ShareStatStyle = 'classic';

/** Пресеты внешнего вида показателей. Сами стили — в ShareCardStatItem.vue. */
export const SHARE_STAT_STYLES: readonly ShareStatStyleOption[] = [
  { id: 'classic', name: 'Классика' },
  { id: 'glass', name: 'Стекло' },
  { id: 'speed', name: 'Скорость' },
  { id: 'tile', name: 'Плитка' },
  { id: 'neon', name: 'Неон' },
  { id: 'minimal', name: 'Минимал' },
];

/** Сетка «N в ряд» и соответствующая ширина показателя. */
export const SHARE_STAT_COLUMN_OPTIONS: readonly { columns: number; width: ShareStatWidth }[] = [
  { columns: 1, width: 'full' },
  { columns: 2, width: 'half' },
  { columns: 3, width: 'third' },
];
