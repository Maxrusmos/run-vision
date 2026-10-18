import type { ShareVideoDotSettings, ShareVideoDotStyle } from './activity-share.types';

/**
 * Видео: точка, бегущая по треку, — стили и геометрия. Одна геометрия (слои в единицах
 * слоя трека, центр — место точки на треке) у SVG на карточке (`VideoDotMark`) и у холста
 * в кадрах видео (`drawVideoDotLayers`).
 */

/** Чем закрашен слой: цвет точки, цвет текста карточки (кольцо) или цвет фона. */
export type VideoDotPaint = 'dot' | 'ring' | 'background';

export type VideoDotPaints = Record<VideoDotPaint, string>;

export type VideoDotLayer =
  | { kind: 'circle'; cy: number; r: number; paint: VideoDotPaint; opacity?: number }
  /** Многоугольник (хвост «пузырька»): точки относительно места на треке. */
  | { kind: 'polygon'; points: readonly (readonly [number, number])[]; paint: VideoDotPaint }
  /** Фото в круге (object-fit: cover). */
  | { kind: 'photo'; cy: number; r: number };

/** Стили точки — плитки в меню «Трек» → «Точка», по порядку. Фото — отдельная плитка. */
export const VIDEO_DOT_STYLES: readonly { id: ShareVideoDotStyle; name: string }[] = [
  { id: 'classic', name: 'Классика' },
  { id: 'solid', name: 'Точка' },
  { id: 'ring', name: 'Кольцо' },
  { id: 'neon', name: 'Неон' },
  { id: 'target', name: 'Мишень' },
];

export const DEFAULT_VIDEO_DOT: ShareVideoDotSettings = {
  style: 'classic',
  photo: null,
};

/** Классика: ореол, кольцо цвета текста и сердцевина цвета точки. */
export const VIDEO_DOT = { radius: 17, ring: 6, halo: 40, haloOpacity: 0.3 } as const;

/**
 * Фото «пузырьком»: круг с фото и обводкой цвета точки над треком, хвостик вниз —
 * к самому месту на треке, там маленькая точка (видно, где именно бегун).
 */
export const VIDEO_DOT_BUBBLE = {
  photo: 54,
  border: 7,
  /** Половина ширины основания хвостика и его кончик над точкой. */
  tailHalf: 17,
  tailTip: -12,
  /** Зазор от кончика хвостика до низа круга. */
  tailLength: 20,
  pin: 8,
  pinRing: 4,
} as const;

const STYLE_LAYERS: Record<ShareVideoDotStyle, readonly VideoDotLayer[]> = {
  classic: [
    { kind: 'circle', cy: 0, r: VIDEO_DOT.halo, paint: 'dot', opacity: VIDEO_DOT.haloOpacity },
    { kind: 'circle', cy: 0, r: VIDEO_DOT.radius + VIDEO_DOT.ring, paint: 'ring' },
    { kind: 'circle', cy: 0, r: VIDEO_DOT.radius, paint: 'dot' },
  ],
  // Плотная точка с обводкой цвета фона — без ореола, читается на любом треке.
  solid: [
    { kind: 'circle', cy: 0, r: 26, paint: 'background' },
    { kind: 'circle', cy: 0, r: 21, paint: 'dot' },
  ],
  // Полое кольцо, в центре — точка цвета текста.
  ring: [
    { kind: 'circle', cy: 0, r: 30, paint: 'dot' },
    { kind: 'circle', cy: 0, r: 20, paint: 'background' },
    { kind: 'circle', cy: 0, r: 8, paint: 'ring' },
  ],
  // Свечение: несколько бледных ореолов и светлая сердцевина.
  neon: [
    { kind: 'circle', cy: 0, r: 58, paint: 'dot', opacity: 0.12 },
    { kind: 'circle', cy: 0, r: 40, paint: 'dot', opacity: 0.22 },
    { kind: 'circle', cy: 0, r: 25, paint: 'dot', opacity: 0.5 },
    { kind: 'circle', cy: 0, r: 15, paint: 'dot' },
    { kind: 'circle', cy: 0, r: 7, paint: 'ring' },
  ],
  // Концентрические кольца — как отметка цели на радаре.
  target: [
    { kind: 'circle', cy: 0, r: 36, paint: 'dot' },
    { kind: 'circle', cy: 0, r: 30, paint: 'background' },
    { kind: 'circle', cy: 0, r: 21, paint: 'dot' },
    { kind: 'circle', cy: 0, r: 15, paint: 'background' },
    { kind: 'circle', cy: 0, r: 8, paint: 'dot' },
  ],
};

function getBubbleLayers(): VideoDotLayer[] {
  const { photo, border, tailHalf, tailTip, tailLength, pin, pinRing } = VIDEO_DOT_BUBBLE;
  const outer = photo + border;
  const cy = tailTip - tailLength - outer;
  // Основание хвостика — на окружности обводки, чтобы стык был без ступеньки.
  const baseY = cy + Math.sqrt(outer * outer - tailHalf * tailHalf);
  return [
    { kind: 'circle', cy: 0, r: pin + pinRing, paint: 'ring' },
    { kind: 'circle', cy: 0, r: pin, paint: 'dot' },
    {
      kind: 'polygon',
      points: [
        [-tailHalf, baseY],
        [tailHalf, baseY],
        [0, tailTip],
      ],
      paint: 'dot',
    },
    { kind: 'circle', cy, r: outer, paint: 'dot' },
    { kind: 'photo', cy, r: photo },
  ];
}

/** Слои точки: с фото — «пузырёк» (стиль тогда не важен), иначе — по стилю. */
export function getVideoDotLayers(
  dot: Pick<ShareVideoDotSettings, 'style' | 'photo'>,
): readonly VideoDotLayer[] {
  if (dot.photo) return getBubbleLayers();
  return STYLE_LAYERS[dot.style] ?? STYLE_LAYERS.classic;
}

/** Фото, уже загруженное в `<img>`: холст рисует его через `drawImage`. */
export type VideoDotPhoto = HTMLImageElement | null;

/**
 * Рисует слои точки на холсте в (`x`, `y`); `unit` — пикселей холста в единице слоя.
 * Фото — по центру круга с обрезкой как у object-fit: cover (как `<image slice>` в SVG).
 */
export function drawVideoDotLayers(
  context: CanvasRenderingContext2D,
  layers: readonly VideoDotLayer[],
  x: number,
  y: number,
  unit: number,
  paints: VideoDotPaints,
  photo: VideoDotPhoto = null,
) {
  context.save();
  for (const layer of layers) {
    context.globalAlpha = 'opacity' in layer && layer.opacity !== undefined ? layer.opacity : 1;
    if (layer.kind === 'circle') {
      context.fillStyle = paints[layer.paint];
      context.beginPath();
      context.arc(x, y + layer.cy * unit, layer.r * unit, 0, Math.PI * 2);
      context.fill();
    } else if (layer.kind === 'polygon') {
      context.fillStyle = paints[layer.paint];
      context.beginPath();
      layer.points.forEach(([px, py], index) => {
        if (index) context.lineTo(x + px * unit, y + py * unit);
        else context.moveTo(x + px * unit, y + py * unit);
      });
      context.closePath();
      context.fill();
    } else if (photo && photo.naturalWidth && photo.naturalHeight) {
      const cx = x;
      const cy = y + layer.cy * unit;
      const r = layer.r * unit;
      const side = Math.min(photo.naturalWidth, photo.naturalHeight);
      context.save();
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      context.clip();
      context.drawImage(
        photo,
        (photo.naturalWidth - side) / 2,
        (photo.naturalHeight - side) / 2,
        side,
        side,
        cx - r,
        cy - r,
        r * 2,
        r * 2,
      );
      context.restore();
    }
  }
  context.restore();
}
