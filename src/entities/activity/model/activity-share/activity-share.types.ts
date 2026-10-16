export type ShareType = 'photo' | 'video';

export type PhotoTemplateId = 'minimal' | 'topographic' | 'custom';

export type ShareStatKey =
  | 'distance'
  | 'duration'
  | 'elapsedTime'
  | 'averagePace'
  | 'averageSpeed'
  | 'bestKm'
  | 'best5k'
  | 'averageHeartRate'
  | 'maxHeartRate'
  | 'averageCadence'
  | 'strideLength'
  | 'elevationGain'
  | 'elevationLoss'
  | 'maxElevation'
  | 'startTime'
  | 'date';

export type ShareStatWidth = 'third' | 'half' | 'full';

/** Пресет внешнего вида показателей (эффект). */
export type ShareStatStyle =
  | 'classic'
  | 'borderless'
  | 'glass'
  | 'speed'
  | 'tile'
  | 'neon'
  | 'minimal'
  | 'inverted'
  | 'retro'
  | 'accent'
  | 'pill'
  | 'gradient'
  | 'marker';

/** Пресет оформления трека. */
export type ShareRouteStyle =
  | 'solid'
  | 'shadow'
  | 'glow'
  | 'outline'
  | 'duo'
  | 'echo'
  | 'stack'
  | 'ghost'
  | 'glitch'
  | 'gradient'
  | 'dashed'
  | 'dotted'
  | 'wall'
  | 'iso'
  | 'tube'
  | 'ribbon';

/** Ячейка показателя в сетке из 6 колонок: строка и первая колонка. */
export type ShareStatPosition = {
  row: number;
  col: number;
};

/**
 * Центр трека в координатах слоя трека.
 * Единицы: ширина слоя = 1000, высота — пропорционально.
 */
export type ShareRoutePosition = {
  x: number;
  y: number;
};

/** Элемент карточки, который можно выделить: показатель, трек или название. */
export type ShareCardElement = ShareStatKey | 'route' | 'title';

export type ShareColorKey = 'backgroundColor' | 'routeColor' | 'textColor';

export type ShareBackgroundImageFit = 'cover' | 'contain';

/** Вид карточки с картой: карта отдельным блоком или во весь фон. */
export type ShareMapLayout = 'block' | 'full';

/** Подложка карты. */
export type ShareMapBase = 'topo' | 'satellite';

/** Карта — фиксированная картинка: трек всегда вписан целиком, жестами не двигается. */
export type ShareMapSettings = {
  layout: ShareMapLayout;
  base: ShareMapBase;
  /** Наклон карты — эффект 3D. */
  tilted: boolean;
};

export type ShareColorPreset = {
  id: string;
  name: string;
  background: string;
  route: string;
  text: string;
};

export type ShareCardSettings = {
  /** Название на карточке; null — название тренировки из GPX. */
  title: string | null;
  titleVisible: boolean;
  backgroundColor: string;
  routeColor: string;
  textColor: string;
  presetId: string | null;
  visibleStats: ShareStatKey[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  /** Позиции, выставленные пользователем; остальные раскладываются автоматически. */
  statPositions: Partial<Record<ShareStatKey, ShareStatPosition>>;
  transparentBackground: boolean;
  statStyle: ShareStatStyle;
  backgroundImage: string | null;
  backgroundImageFit: ShareBackgroundImageFit;
  backgroundImagePosition: string;
  statSpacing: number;
  routeVisible: boolean;
  /** Масштаб трека: 1 — заполняет место под трек. */
  routeScale: number;
  routeStyle: ShareRouteStyle;
  /** null — трек стоит на своём месте между названием и показателями. */
  routePosition: ShareRoutePosition | null;
  /** Карта под треком (шаблон «Топография»); null — карточка без карты. */
  map: ShareMapSettings | null;
};

export type ShareStatOption = {
  key: ShareStatKey;
  /** Название в списке добавления показателей. */
  label: string;
  /** Короткое название, которое выводится на карточке. */
  cardLabel: string;
};

export type ShareStat = {
  key: ShareStatKey;
  label: string;
  value: string;
};

export type PhotoTemplate = {
  id: Exclude<PhotoTemplateId, 'custom'>;
  title: string;
  description: string;
  presetId: string;
};
