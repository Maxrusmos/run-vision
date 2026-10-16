/**
 * Сборка PNG карточки с фоновым фото без html-to-image для самого фото.
 *
 * Зачем: html-to-image переносит карточку в SVG (foreignObject), и iOS Safari рисует
 * такой SVG в холст раньше, чем декодирует вложенную картинку, — с первого раза фото
 * в PNG не попадает (со второго-третьего — уже из кэша). Поэтому карточка рендерится
 * без фото и с прозрачным фоном, а фото рисуется на холст напрямую из уже загруженного
 * `<img>` — с теми же object-fit / object-position и скруглением углов.
 */

export type ImageRect = { x: number; y: number; width: number; height: number };

/** Позиция по оси: доля (0…1, как проценты) или сдвиг в пикселях раскладки. */
export type ObjectPositionAxis = { fraction: number } | { pixels: number };

/** Разбор вычисленного `object-position` (`50% 50%`, `10px 0%`, ключевые слова). */
export function parseObjectPosition(value: string): [ObjectPositionAxis, ObjectPositionAxis] {
  const keywords: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const parse = (token: string | undefined): ObjectPositionAxis => {
    if (!token) return { fraction: 0.5 };
    if (token in keywords) return { fraction: keywords[token]! };
    if (token.endsWith('%')) return { fraction: parseFloat(token) / 100 };
    const pixels = parseFloat(token);
    return Number.isFinite(pixels) ? { pixels } : { fraction: 0.5 };
  };
  const tokens = value.trim().split(/\s+/);
  // Одно ключевое слово по вертикали («top») — вторая ось по центру.
  if (tokens.length === 1 && (tokens[0] === 'top' || tokens[0] === 'bottom')) {
    return [{ fraction: 0.5 }, parse(tokens[0])];
  }
  return [parse(tokens[0]), parse(tokens[1])];
}

/**
 * Прямоугольник картинки `imageWidth × imageHeight` в рамке `width × height`
 * по правилам object-fit (cover / contain / fill / none) и object-position.
 * `pixelScale` — во сколько раз холст больше раскладки (для сдвигов в px).
 */
export function getObjectFitRect(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  fit: string,
  position: [ObjectPositionAxis, ObjectPositionAxis],
  pixelScale = 1,
): ImageRect {
  let drawWidth = width;
  let drawHeight = height;
  if (fit === 'cover' || fit === 'contain' || fit === 'none' || fit === 'scale-down') {
    const cover = Math.max(width / imageWidth, height / imageHeight);
    const contain = Math.min(width / imageWidth, height / imageHeight);
    const scale =
      fit === 'cover'
        ? cover
        : fit === 'contain'
          ? contain
          : fit === 'none'
            ? pixelScale
            : Math.min(pixelScale, contain);
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
  }

  const offset = (axis: ObjectPositionAxis, free: number) =>
    'fraction' in axis ? free * axis.fraction : axis.pixels * pixelScale;

  return {
    x: offset(position[0], width - drawWidth),
    y: offset(position[1], height - drawHeight),
    width: drawWidth,
    height: drawHeight,
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(r, 0);
  context.arcTo(width, 0, width, height, r);
  context.arcTo(width, height, 0, height, r);
  context.arcTo(0, height, 0, 0, r);
  context.arcTo(0, 0, width, 0, r);
  context.closePath();
}

type ComposeOptions = {
  /** Карточка без фото, отрендеренная html-to-image (прозрачный фон). */
  overlay: HTMLCanvasElement;
  /** Карточка в документе — для размеров и скругления углов. */
  card: HTMLElement;
  /** Загруженное фото фона (элемент карточки). */
  photo: HTMLImageElement;
  /** Цвет под фото (виден при object-fit: contain). */
  backgroundColor?: string;
};

/** Фото фона + карточка поверх → PNG (data URL). */
export function composeWithBackdrop({
  overlay,
  card,
  photo,
  backgroundColor,
}: ComposeOptions): string {
  const canvas = document.createElement('canvas');
  canvas.width = overlay.width;
  canvas.height = overlay.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D недоступен');

  const pixelScale = card.offsetWidth ? canvas.width / card.offsetWidth : 1;
  const radius = (parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0) * pixelScale;

  context.save();
  roundedRectPath(context, canvas.width, canvas.height, radius);
  context.clip();

  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const style = getComputedStyle(photo);
  const rect = getObjectFitRect(
    photo.naturalWidth,
    photo.naturalHeight,
    canvas.width,
    canvas.height,
    style.objectFit,
    parseObjectPosition(style.objectPosition),
    pixelScale,
  );
  context.drawImage(photo, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  context.drawImage(overlay, 0, 0);
  return canvas.toDataURL('image/png');
}
