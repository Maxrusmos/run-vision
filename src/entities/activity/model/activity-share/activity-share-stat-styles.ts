import type { ShareStatStyle, ShareStatWidth } from './activity-share.types';

export type ShareStatStyleOption = {
  id: ShareStatStyle;
  name: string;
};

export const DEFAULT_STAT_STYLE: ShareStatStyle = 'classic';

/** Пресеты внешнего вида показателей. Сами стили — в ShareCardStatItem.vue. */
export const SHARE_STAT_STYLES: readonly ShareStatStyleOption[] = [
  { id: 'classic', name: 'Классика' },
  { id: 'borderless', name: 'Без рамки' },
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

/** Плотность показателей: расстояние между ними и внутренние отступы. */
export const SHARE_STAT_DENSITY_OPTIONS: readonly { spacing: number; label: string }[] = [
  { spacing: 4, label: 'Плотно' },
  { spacing: 12, label: 'Обычно' },
  { spacing: 20, label: 'Свободно' },
];
