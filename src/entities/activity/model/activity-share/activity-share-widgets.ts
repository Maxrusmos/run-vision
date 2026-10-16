import type {
  ShareElevationSize,
  ShareTelemetrySettings,
  ShareWidgetKind,
} from './activity-share.types';
import { getElevationSizeRatio } from './activity-share-elevation';

export type ShareWidgetOption = {
  kind: ShareWidgetKind;
  /** Название в меню. */
  name: string;
  /** Заголовок на карточке (капсом, как на приборной панели). */
  title: string;
  icon: string;
  /** Нужен пульс в GPX. */
  needsHeartRate?: boolean;
  /** Высота относительно обычной: зонам нужно место под пять строк. */
  heightFactor?: number;
};

export const SHARE_WIDGETS: readonly ShareWidgetOption[] = [
  { kind: 'splits', name: 'Сплиты', title: 'Сплиты · км', icon: 'mdi-chart-bar' },
  {
    kind: 'zones',
    name: 'Зоны пульса',
    title: 'Пульсовые зоны',
    icon: 'mdi-heart-pulse',
    needsHeartRate: true,
    heightFactor: 1.35,
  },
  { kind: 'pace', name: 'Темп', title: 'Темп', icon: 'mdi-speedometer' },
  {
    kind: 'heartRate',
    name: 'Пульс',
    title: 'Пульс',
    icon: 'mdi-heart-outline',
    needsHeartRate: true,
  },
  { kind: 'elevation', name: 'Высота', title: 'Высота', icon: 'mdi-image-filter-hdr' },
];

export function findShareWidget(kind: ShareWidgetKind): ShareWidgetOption {
  return SHARE_WIDGETS.find((widget) => widget.kind === kind) ?? SHARE_WIDGETS[0]!;
}

/** Высота виджета к ширине: размер S/M/L плюс строка заголовка. */
export function getWidgetRatio(kind: ShareWidgetKind, size: ShareElevationSize): number {
  return (getElevationSizeRatio(size) + 0.05) * (findShareWidget(kind).heightFactor ?? 1);
}

export function createShareTelemetrySettings(hasHeartRate: boolean): ShareTelemetrySettings {
  const kinds: ShareWidgetKind[] = hasHeartRate
    ? ['splits', 'pace', 'zones']
    : ['splits', 'pace', 'elevation'];
  return {
    widgets: kinds.map((kind) => ({ kind, row: null })),
    size: 'medium',
    chartStyle: 'gradient',
    color: null,
    labels: true,
    grid: true,
  };
}

/** Ключ полосы виджета в сетке и элемента выделения. */
export function getWidgetKey(kind: ShareWidgetKind): `widget-${ShareWidgetKind}` {
  return `widget-${kind}`;
}
