import type { ShareRouteStyle } from './activity-share.types';

/** Цвет слоя: из оформления карточки или фиксированный (#rrggbb). */
export type RouteLayerColor = 'route' | 'text' | 'background' | `#${string}`;

/**
 * Один слой трека — копия линии со своими сдвигом, масштабом, толщиной,
 * цветом и прозрачностью. Сдвиг и толщина — в единицах слоя трека
 * (ширина карточки = 1000), толщина — множитель базовой.
 */
export type RouteStrokeLayer = {
  dx?: number;
  dy?: number;
  /** Масштаб копии относительно центра трека. */
  scale?: number;
  width?: number;
  opacity?: number;
  color?: RouteLayerColor;
  dash?: 'dash' | 'dot';
  /** Градиент от цвета трека к цвету текста. */
  gradient?: boolean;
};

export type ShareRouteStyleOption = {
  id: ShareRouteStyle;
  name: string;
  /** Слои снизу вверх; последний — основной, на нём точка старта. */
  layers: readonly RouteStrokeLayer[];
};

export const DEFAULT_ROUTE_STYLE: ShareRouteStyle = 'solid';

/**
 * Объём «выдавливанием»: много полупрозрачных копий со сдвигом, которые
 * сливаются в сплошную боковую грань. Идут от дальней к ближней.
 */
function extrude(steps: number, dx: number, dy: number, opacity: number): RouteStrokeLayer[] {
  return Array.from({ length: steps }, (_, index) => {
    const distance = steps - index;
    return { dx: dx * distance, dy: dy * distance, opacity };
  });
}

const RAINBOW = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#bf5af2'] as const;

/**
 * Пресеты трека. Эффекты собраны из обычных линий (без SVG-фильтров и режимов
 * наложения), поэтому в PNG выглядят так же, как в редакторе.
 */
export const SHARE_ROUTE_STYLES: readonly ShareRouteStyleOption[] = [
  { id: 'solid', name: 'Обычный', layers: [{}] },
  {
    id: 'shadow',
    name: 'Тень',
    layers: [{ dx: 6, dy: 9, width: 1.2, color: '#000000', opacity: 0.35 }, {}],
  },
  {
    id: 'glow',
    name: 'Свечение',
    layers: [{ width: 4.5, opacity: 0.12 }, { width: 2.6, opacity: 0.25 }, {}],
  },
  { id: 'outline', name: 'Контур', layers: [{ width: 2.4 }, { width: 1, color: 'background' }] },
  { id: 'duo', name: 'Дуэт', layers: [{ dx: 9, dy: 9, color: 'text', opacity: 0.9 }, {}] },
  {
    id: 'echo',
    name: 'Эхо',
    layers: [
      { dx: -27, dy: 27, opacity: 0.18 },
      { dx: -18, dy: 18, opacity: 0.35 },
      { dx: -9, dy: 9, opacity: 0.6 },
      {},
    ],
  },
  {
    id: 'stack',
    name: 'Стопка',
    layers: [{ dy: 39, opacity: 0.15 }, { dy: 26, opacity: 0.3 }, { dy: 13, opacity: 0.55 }, {}],
  },
  {
    id: 'ghost',
    name: 'Призрак',
    layers: [{ scale: 1.14, opacity: 0.15 }, { scale: 1.07, opacity: 0.32 }, {}],
  },
  {
    id: 'glitch',
    name: 'Глитч',
    layers: [
      { dx: -6, color: '#ff2d55', opacity: 0.85 },
      { dx: 6, color: '#00e5ff', opacity: 0.85 },
      {},
    ],
  },
  { id: 'gradient', name: 'Градиент', layers: [{ width: 1.2, gradient: true }] },
  { id: 'dashed', name: 'Пунктир', layers: [{ dash: 'dash' }] },
  { id: 'dotted', name: 'Точки', layers: [{ width: 1.4, dash: 'dot' }] },
  {
    id: 'wall',
    name: 'Стена',
    layers: [
      // Тень у основания, грань стены, верх с бликом.
      { dy: 44, width: 1.4, color: '#000000', opacity: 0.3 },
      ...extrude(14, 0, 3, 0.22),
      {},
      { width: 0.35, color: '#ffffff', opacity: 0.85 },
    ],
  },
  {
    id: 'iso',
    name: 'Изометрия',
    layers: [...extrude(12, -2, 2.5, 0.2), {}, { width: 0.35, color: '#ffffff', opacity: 0.8 }],
  },
  {
    id: 'tube',
    name: 'Трубка',
    layers: [
      { width: 5, opacity: 0.14 },
      { width: 3, opacity: 0.32 },
      { width: 1.6 },
      { width: 0.45, color: '#ffffff', opacity: 0.9 },
    ],
  },
  {
    id: 'ribbon',
    name: 'Лента',
    layers: [
      { dy: 7, width: 3.2, color: '#000000', opacity: 0.3 },
      { width: 3 },
      { width: 1, color: 'background', opacity: 0.35 },
    ],
  },
  {
    id: 'rainbow',
    name: 'Радуга',
    layers: RAINBOW.map((color, index) => ({
      dy: (index - (RAINBOW.length - 1) / 2) * 7,
      width: 0.9,
      color,
    })),
  },
];

export function findRouteStyle(id: ShareRouteStyle): ShareRouteStyleOption {
  return SHARE_ROUTE_STYLES.find((style) => style.id === id) ?? SHARE_ROUTE_STYLES[0]!;
}
