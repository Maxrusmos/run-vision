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
  /**
   * Градиент вдоль трека (по диагонали рамки): `true` — от цвета трека к цвету текста,
   * список — свои цвета по порядку (Pro-стили: радуга, закат, огонь…).
   */
  gradient?: boolean | readonly RouteLayerColor[];
  /**
   * Объём «выдавливанием»: `steps` непрозрачных копий со сдвигом (dx, dy) на шаг,
   * прозрачность — у группы целиком. Так грань сплошная: полупрозрачные копии
   * по отдельности накладываются в узлах линии и дают точки.
   */
  extrude?: { steps: number; dx: number; dy: number };
};

export type ShareRouteStyleOption = {
  id: ShareRouteStyle;
  name: string;
  /** Только с подпиской Pro (без неё — посмотреть с водяными знаками, сохранить нельзя). */
  pro?: boolean;
  /** Слои снизу вверх; последний — основной, на нём точка старта. */
  layers: readonly RouteStrokeLayer[];
};

export const DEFAULT_ROUTE_STYLE: ShareRouteStyle = 'solid';

/** Объём «выдавливанием»: сплошная боковая грань из копий линии. */
function extrude(steps: number, dx: number, dy: number, opacity: number): RouteStrokeLayer {
  return { extrude: { steps, dx, dy }, opacity };
}

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
    id: 'iso',
    name: 'Изометрия',
    layers: [extrude(12, -2, 2.5, 0.4), {}, { width: 0.35, color: '#ffffff', opacity: 0.8 }],
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
];

const RAINBOW = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7FF',
  '#5856D6',
  '#AF52DE',
] as const;

/**
 * Pro-стили трека: объём («Стена»), «Призрак», многоцветные градиенты, неон, «шоссе»
 * с разметкой, металл. В меню — после обычных, с короной.
 */
export const PRO_ROUTE_STYLES: readonly ShareRouteStyleOption[] = [
  {
    id: 'wall',
    name: 'Стена',
    pro: true,
    layers: [
      // Тень у основания, грань стены, верх с бликом.
      { dy: 44, width: 1.4, color: '#000000', opacity: 0.3 },
      extrude(14, 0, 3, 0.45),
      {},
      { width: 0.35, color: '#ffffff', opacity: 0.85 },
    ],
  },
  {
    id: 'ghost',
    name: 'Призрак',
    pro: true,
    layers: [{ scale: 1.14, opacity: 0.15 }, { scale: 1.07, opacity: 0.32 }, {}],
  },
  {
    id: 'pro-rainbow',
    name: 'Радуга',
    pro: true,
    layers: [
      { width: 3.2, gradient: RAINBOW, opacity: 0.18 },
      { width: 1.3, gradient: RAINBOW },
    ],
  },
  {
    id: 'pro-sunset',
    name: 'Закат',
    pro: true,
    layers: [
      { dx: 5, dy: 8, width: 1.3, color: '#000000', opacity: 0.3 },
      { width: 1.4, gradient: ['#FFD166', '#F78C6B', '#EF476F', '#7B2CBF'] },
    ],
  },
  {
    id: 'pro-fire',
    name: 'Пламя',
    pro: true,
    layers: [
      { width: 5, gradient: ['#FFB000', '#FF3D00', '#8B0000'], opacity: 0.16 },
      { width: 2.8, gradient: ['#FFB000', '#FF3D00', '#8B0000'], opacity: 0.35 },
      { width: 1.4, gradient: ['#FFF3B0', '#FF9100', '#E53935'] },
      { width: 0.35, color: '#FFFDE7', opacity: 0.9 },
    ],
  },
  {
    id: 'pro-plasma',
    name: 'Плазма',
    pro: true,
    layers: [
      { width: 6, gradient: true, opacity: 0.1 },
      { width: 3.6, gradient: true, opacity: 0.22 },
      { width: 1.6, gradient: true },
      { width: 0.45, color: '#ffffff', opacity: 0.95 },
    ],
  },
  {
    id: 'pro-road',
    name: 'Шоссе',
    pro: true,
    layers: [
      { dy: 6, width: 3.2, color: '#000000', opacity: 0.3 },
      { width: 3, color: '#2F3236' },
      { width: 2.6, color: '#45494F' },
      { width: 0.28, color: '#FFD60A', dash: 'dash' },
    ],
  },
  {
    id: 'pro-chrome',
    name: 'Хром',
    pro: true,
    layers: [
      { dx: 4, dy: 7, width: 2, color: '#000000', opacity: 0.35 },
      { width: 2, color: '#5F6670' },
      { width: 1.5, gradient: ['#F5F7FA', '#9AA4B1', '#E9EDF2', '#7C8794'] },
      { dy: -2, width: 0.4, color: '#ffffff', opacity: 0.9 },
    ],
  },
  {
    id: 'pro-hologram',
    name: 'Голограмма',
    pro: true,
    layers: [
      { dx: -7, dy: 3, width: 1.1, color: '#00F5D4', opacity: 0.55 },
      { dx: 7, dy: -3, width: 1.1, color: '#F15BB5', opacity: 0.55 },
      { width: 1.3, gradient: ['#00F5D4', '#9B5DE5', '#F15BB5'] },
      { width: 0.35, color: '#ffffff', opacity: 0.85 },
    ],
  },
];

export function findRouteStyle(id: ShareRouteStyle): ShareRouteStyleOption {
  return (
    SHARE_ROUTE_STYLES.find((style) => style.id === id) ??
    PRO_ROUTE_STYLES.find((style) => style.id === id) ??
    SHARE_ROUTE_STYLES[0]!
  );
}
