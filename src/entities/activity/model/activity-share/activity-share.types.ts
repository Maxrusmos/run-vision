export type ShareType = 'photo' | 'video';

export type PhotoTemplateId = 'minimal' | 'topographic' | 'telemetry';

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
  | 'marker'
  | 'brackets'
  | 'outline'
  | 'dashed';

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

/** Виджет «Телеметрии» — полоса на всю ширину сетки показателей. */
export type ShareWidgetKind = 'splits' | 'zones' | 'pace' | 'heartRate' | 'elevation';

/** Боковая колонка у края области трека. */
export type ShareWidgetSide = 'left' | 'right';

export type ShareWidget = {
  kind: ShareWidgetKind;
  /** Строка в сетке показателей; null — по порядку сразу под треком. */
  row: number | null;
  /** Вертикально у края области трека; null — строкой на всю ширину. */
  side: ShareWidgetSide | null;
};

/** Шаблон «Телеметрия»: виджеты и общее оформление графиков. */
export type ShareTelemetrySettings = {
  /** Виджеты на карточке (порядок — для раскладки без заданных строк). */
  widgets: ShareWidget[];
  size: ShareElevationSize;
  /** Вид графиков темпа, пульса и высоты (те же стили, что у графика высоты). */
  chartStyle: ShareElevationStyle;
  /** null — цвет трека. */
  color: string | null;
  /** Сводка в заголовке виджета (средний, лучший и т.п.). */
  labels: boolean;
  /** Тонкая сетка-разметка на фоне, как у приборной панели. */
  grid: boolean;
};

/** Элемент карточки, который можно выделить: показатель, трек, название, график, виджет. */
export type ShareCardElement =
  ShareStatKey | 'route' | 'title' | 'elevation' | `widget-${ShareWidgetKind}`;

export type ShareColorKey = 'backgroundColor' | 'routeColor' | 'textColor';

export type ShareBackgroundImageFit = 'cover' | 'contain';

/** Вид карточки с картой: карта отдельным блоком или во весь фон. */
export type ShareMapLayout = 'block' | 'full';

/** Стиль карты: подложка и её обработка (тонирование, инверсия, ч/б). */
export type ShareMapStyle =
  | 'light'
  | 'dark'
  | 'tinted'
  | 'night'
  | 'blueprint'
  | 'vintage'
  | 'satellite'
  | 'satellite-mono'
  | 'satellite-dark'
  | 'satellite-tinted';

/** Наклон трека (вместе с картой, если она есть), градусы. */
export type ShareRoutePitch = 0 | 35 | 60;

/** Карта — фиксированная картинка: трек всегда вписан целиком, жестами не двигается. */
export type ShareMapSettings = {
  layout: ShareMapLayout;
  style: ShareMapStyle;
};

/** Вид графика высоты. */
export type ShareElevationStyle =
  | 'area'
  | 'line'
  | 'silhouette'
  | 'bars'
  | 'climbs'
  | 'steps'
  | 'strokes'
  | 'dots'
  | 'wave'
  | 'glow'
  | 'gradient'
  | 'mountain'
  | 'ridges'
  | 'lollipop'
  | 'dashed'
  | 'contour';

export type ShareElevationSize = 'small' | 'medium' | 'large';

/** График высоты на карточке с картой. */
export type ShareElevationSettings = {
  visible: boolean;
  style: ShareElevationStyle;
  size: ShareElevationSize;
  /** null — цвет трека. */
  color: string | null;
  /** Подписи: минимум/максимум высоты и набор. */
  labels: boolean;
  /** Строка в сетке показателей; null — сразу под картой. */
  row: number | null;
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
  /**
   * Поворот трека, градусы (0 — север сверху, больше — против часовой). С картой
   * поворачивается и карта вокруг трека; трек всегда вписан целиком.
   */
  routeBearing: number;
  /** Наклон трека (с картой — наклон карты). */
  routePitch: ShareRoutePitch;
  /** Флажки на треке: отметки километров (шаг — по дистанции) и старт/финиш. */
  routeKmMarkers: boolean;
  routeStartFinish: boolean;
  /** Карта под треком (шаблон «Топография»); null — карточка без карты. */
  map: ShareMapSettings | null;
  /** График высоты (только у карточки с картой). */
  elevation: ShareElevationSettings | null;
  /** Виджеты (только у «Телеметрии»). */
  telemetry: ShareTelemetrySettings | null;
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
  id: PhotoTemplateId;
  title: string;
  description: string;
  presetId: string;
};
