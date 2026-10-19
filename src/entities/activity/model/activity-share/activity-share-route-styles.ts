import type { ShareRouteStyle } from './activity-share.types';

/**
 * Оттенок от цвета трека: сдвиг тона (градусы) и светлоты (−1…1, доля пути к чёрному или
 * белому). Так Pro-стили с переливами («Закат», «Пламя», «Голограмма») следуют выбранному
 * цвету трека, а не задают свои.
 */
export type RouteColorShift = { hue?: number; light?: number };

/** Цвет слоя: из оформления карточки, оттенок цвета трека или фиксированный (#rrggbb). */
export type RouteLayerColor =
  'route' | 'text' | 'background' | `#${string}` | { shift: RouteColorShift };

export type RouteLayerPalette = { route: string; text: string; background: string };

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
  /**
   * Свои цвета, цвет трека не используется («Радуга», «Шоссе», «Хром»): смена цвета трека
   * сначала предупреждает и переводит трек на стиль шаблона. Новые стили так не делать —
   * пусть следуют цвету трека (`route`, `{ shift }`), как «Стена» и «Призрак».
   */
  ownColors?: boolean;
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
 * «Монограмма»: копии трека вокруг основного (масштаб от центра), тонкие и прозрачнее к
 * краям. Толщина делится на масштаб — у всех копий линия одной толщины.
 */
function monogram(): RouteStrokeLayer[] {
  return [0.85, 0.9, 0.95, 1.05, 1.1, 1.15].map((scale) => ({
    scale,
    width: 0.4 / scale,
    opacity: 0.6 - Math.abs(1 - scale) * 3,
  }));
}

/**
 * Pro-стили трека: объём («Стена»), «Призрак», «Монограмма» и другие копии линии цвета
 * трека, «Радуга», «Плазма», «Шоссе» с разметкой, «Голограмма», «Глитч». В меню — после
 * обычных, с короной. Новые — только от цвета трека (см. `ownColors`).
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
    id: 'pro-monogram',
    name: 'Монограмма',
    pro: true,
    // Флажки и старт — у основной линии (последний слой), копии без них.
    layers: [...monogram(), { width: 1.1 }],
  },
  {
    id: 'pro-relief',
    name: 'Рельеф',
    pro: true,
    // Линии над и под треком, как горизонтали на карте.
    layers: [
      { dy: -36, width: 0.4, opacity: 0.2 },
      { dy: -24, width: 0.45, opacity: 0.35 },
      { dy: -12, width: 0.5, opacity: 0.55 },
      { dy: 12, width: 0.5, opacity: 0.55 },
      { dy: 24, width: 0.45, opacity: 0.35 },
      { dy: 36, width: 0.4, opacity: 0.2 },
      {},
    ],
  },
  {
    id: 'pro-float',
    name: 'Парение',
    pro: true,
    // Трек висит над карточкой: мягкая тень далеко внизу, сверху блик.
    layers: [
      { dy: 42, width: 3.4, color: '#000000', opacity: 0.08 },
      { dy: 42, width: 2.2, color: '#000000', opacity: 0.14 },
      { dy: 42, width: 1.1, color: '#000000', opacity: 0.22 },
      { width: 1.2 },
      { dy: -2, width: 0.35, color: '#ffffff', opacity: 0.8 },
    ],
  },
  {
    id: 'pro-double',
    name: 'Двойной',
    pro: true,
    // Полый контур с тонкой линией внутри и мягким ореолом.
    layers: [
      { width: 4.4, opacity: 0.14 },
      { width: 3 },
      { width: 2.1, color: 'background' },
      { width: 0.5 },
    ],
  },
  {
    id: 'pro-sketch',
    name: 'Эскиз',
    pro: true,
    // Несколько чуть сдвинутых тонких линий — как набросок карандашом.
    layers: [
      { dx: -9, dy: 6, width: 0.35, opacity: 0.7 },
      { dx: 8, dy: -5, width: 0.35, opacity: 0.7 },
      { dx: 4, dy: 10, width: 0.3, opacity: 0.5 },
      { dx: -6, dy: -9, width: 0.3, opacity: 0.5 },
      { width: 0.6 },
    ],
  },
  {
    id: 'pro-rainbow',
    ownColors: true,
    name: 'Радуга',
    pro: true,
    layers: [
      { width: 3.2, gradient: RAINBOW, opacity: 0.18 },
      { width: 1.3, gradient: RAINBOW },
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
    ownColors: true,
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
    id: 'pro-hologram',
    name: 'Голограмма',
    pro: true,
    layers: [
      { dx: -7, dy: 3, width: 1.1, color: { shift: { hue: 70 } }, opacity: 0.55 },
      { dx: 7, dy: -3, width: 1.1, color: { shift: { hue: -70 } }, opacity: 0.55 },
      { width: 1.3, gradient: [{ shift: { hue: 70 } }, 'route', { shift: { hue: -70 } }] },
      { width: 0.35, color: '#ffffff', opacity: 0.85 },
    ],
  },
  {
    id: 'glitch',
    name: 'Глитч',
    pro: true,
    // Основная линия — цвета трека, сдвинутые копии — «сбой» RGB.
    layers: [
      { dx: -6, color: '#ff2d55', opacity: 0.85 },
      { dx: 6, color: '#00e5ff', opacity: 0.85 },
      {},
    ],
  },
];

/**
 * Убранные стили (черновики, шаблоны в аккаунте) → ближайшие: «Пламя» — как «Плазма»,
 * «Закат» — «Градиент», «Хром» — «Лента».
 */
export const REMOVED_ROUTE_STYLES: Readonly<Record<string, ShareRouteStyle>> = {
  'pro-fire': 'pro-plasma',
  'pro-sunset': 'gradient',
  'pro-chrome': 'ribbon',
};

export function findRouteStyle(id: ShareRouteStyle): ShareRouteStyleOption {
  return (
    SHARE_ROUTE_STYLES.find((style) => style.id === id) ??
    PRO_ROUTE_STYLES.find((style) => style.id === id) ??
    SHARE_ROUTE_STYLES[0]!
  );
}

/** Цвет слоя для отрисовки (SVG и превью). */
export function resolveRouteLayerColor(
  color: RouteLayerColor | undefined,
  palette: RouteLayerPalette,
): string {
  if (color === undefined || color === 'route') return palette.route;
  if (color === 'text') return palette.text;
  if (color === 'background') return palette.background;
  if (typeof color === 'object') return shiftColor(palette.route, color.shift);
  return color;
}

/** Сдвиг тона и светлоты цвета #rrggbb (в HSL); не #rrggbb — как есть. */
export function shiftColor(hex: string, { hue = 0, light = 0 }: RouteColorShift): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = Number.parseInt(match[1]!, 16);
  const [h, sat, l] = rgbToHsl((value >> 16) & 255, (value >> 8) & 255, value & 255);
  const lightness = light >= 0 ? l + (1 - l) * light : l * (1 + light);
  return hslToHex((((h + hue) % 360) + 360) % 360, sat, Math.min(1, Math.max(0, lightness)));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
