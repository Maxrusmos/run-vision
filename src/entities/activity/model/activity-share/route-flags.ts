import type { RoutePoint } from '@/entities/activity/lib/route-projection';

/**
 * Флажки на треке: отметка километра (древко + полотнище с числом) и клетчатый финиш.
 * Размеры — в единицах слоя трека (ширина карточки = 1000), `unit` — пикселей в единице.
 * Одна геометрия у SVG на карточке (`RouteMarkers`) и у холста в кадрах видео.
 */
export const ROUTE_FLAG = {
  pole: 44,
  height: 30,
  fontSize: 21,
  digitWidth: 12,
  padding: 9,
  poleWidth: 3,
  radius: 4,
  frameWidth: 2,
  startRing: 17,
  startRingWidth: 4,
} as const;

export type FlagLine = { x1: number; y1: number; x2: number; y2: number };
export type FlagRect = { x: number; y: number; width: number; height: number };

export type KmFlagShape = {
  pole: FlagLine;
  banner: FlagRect & { radius: number };
  text: { x: number; y: number; size: number; label: string };
};

export type FinishFlagShape = {
  pole: FlagLine;
  frame: FlagRect;
  cells: (FlagRect & { dark: boolean })[];
};

/** Флажок километра: древко вверх от точки трека, полотнище справа. */
export function getKmFlagShape(point: RoutePoint, label: string, unit: number): KmFlagShape {
  const width = (ROUTE_FLAG.padding * 2 + ROUTE_FLAG.digitWidth * label.length) * unit;
  const height = ROUTE_FLAG.height * unit;
  const top = point.y - ROUTE_FLAG.pole * unit;
  const size = ROUTE_FLAG.fontSize * unit;
  return {
    pole: { x1: point.x, y1: point.y, x2: point.x, y2: top },
    banner: { x: point.x, y: top, width, height, radius: ROUTE_FLAG.radius * unit },
    // Базовая линия по центру полотнища (без dominant-baseline — его не везде переносит экспорт).
    text: { x: point.x + width / 2, y: top + height / 2 + size * 0.36, size, label },
  };
}

/** Флажок финиша: древко и полотнище в клетку 3 × 2. */
export function getFinishFlagShape(point: RoutePoint, unit: number): FinishFlagShape {
  const cell = (ROUTE_FLAG.height / 2) * unit;
  const top = point.y - ROUTE_FLAG.pole * unit;
  const cells: FinishFlagShape['cells'] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        x: point.x + col * cell,
        y: top + row * cell,
        width: cell,
        height: cell,
        dark: (row + col) % 2 === 0,
      });
    }
  }
  return {
    pole: { x1: point.x, y1: point.y, x2: point.x, y2: top },
    frame: { x: point.x, y: top, width: cell * 3, height: cell * 2 },
    cells,
  };
}

/** Длительность «выпрыгивания» флажка в видео, секунды. */
export const FLAG_POP_SECONDS = 0.45;
/** Перелёт: флажок вырастает чуть больше своего размера и возвращается. */
const POP_OVERSHOOT = 2.4;

/**
 * Масштаб флажка в видео: 0 — точка ещё не дошла, дальше — «выпрыгивает» из трека
 * (рост от основания древка с перелётом, easeOutBack) и стоит в своём размере.
 * `elapsed` — сколько секунд видео прошло с момента, когда точка дошла до флажка.
 */
export function getFlagPopScale(elapsed: number): number {
  if (elapsed < 0) return 0;
  if (elapsed >= FLAG_POP_SECONDS) return 1;
  const t = elapsed / FLAG_POP_SECONDS - 1;
  return 1 + (POP_OVERSHOOT + 1) * t * t * t + POP_OVERSHOOT * t * t;
}

/** Масштаб с центром в основании древка — флажок растёт из трека. */
export function getFlagPopTransform(point: RoutePoint, scale: number): string {
  return `translate(${point.x} ${point.y}) scale(${scale}) translate(${-point.x} ${-point.y})`;
}

export type FlagColors = { text: string; background: string };

function strokeLine(context: CanvasRenderingContext2D, line: FlagLine) {
  context.beginPath();
  context.moveTo(line.x1, line.y1);
  context.lineTo(line.x2, line.y2);
  context.stroke();
}

/** Флажок километра на холсте — как в SVG `RouteMarkers` (прозрачности те же). */
export function drawKmFlag(
  context: CanvasRenderingContext2D,
  shape: KmFlagShape,
  unit: number,
  colors: FlagColors,
  fontFamily: string,
) {
  context.save();
  context.strokeStyle = colors.text;
  context.lineWidth = ROUTE_FLAG.poleWidth * unit;
  context.globalAlpha = 0.75;
  strokeLine(context, shape.pole);
  context.globalAlpha = 0.88;
  context.fillStyle = colors.text;
  const { x, y, width, height, radius } = shape.banner;
  context.beginPath();
  // roundRect нет в старых браузерах (запасная запись видео идёт именно там).
  if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius);
  else context.rect(x, y, width, height);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = colors.background;
  context.font = `700 ${shape.text.size}px ${fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(shape.text.label, shape.text.x, shape.text.y);
  context.restore();
}

/** Флажок финиша на холсте — как в SVG `RouteMarkers`. */
export function drawFinishFlag(
  context: CanvasRenderingContext2D,
  shape: FinishFlagShape,
  unit: number,
  colors: FlagColors,
) {
  context.save();
  context.strokeStyle = colors.text;
  context.lineWidth = ROUTE_FLAG.poleWidth * unit;
  strokeLine(context, shape.pole);
  context.lineWidth = ROUTE_FLAG.frameWidth * unit;
  const { frame } = shape;
  context.strokeRect(frame.x, frame.y, frame.width, frame.height);
  for (const cell of shape.cells) {
    context.fillStyle = cell.dark ? colors.text : colors.background;
    context.fillRect(cell.x, cell.y, cell.width, cell.height);
  }
  context.restore();
}

/** Рисует флажок, «выпрыгнувший» на `scale` (масштаб от основания древка). */
export function drawPoppedFlag(
  context: CanvasRenderingContext2D,
  point: RoutePoint,
  scale: number,
  draw: () => void,
) {
  if (scale <= 0) return;
  context.save();
  context.translate(point.x, point.y);
  context.scale(scale, scale);
  context.translate(-point.x, -point.y);
  draw();
  context.restore();
}

/** Флажок: километр (число) или финиш. */
export type RouteFlagKey = number | 'finish';

/**
 * Где на треке флажок — доля дистанции (финиш — 1). `totalMeters` — длина трека тем же
 * способом, что у `getKmMarkers` (по точкам с координатами).
 */
export function getFlagReach(flag: RouteFlagKey, totalMeters: number): number {
  if (flag === 'finish' || totalMeters <= 0) return 1;
  return Math.min(1, (flag * 1000) / totalMeters);
}

/** Флажки трека для кадров видео: основание древка, подпись и доля дистанции. */
export type RouteFlagPoint = RoutePoint & { flag: RouteFlagKey; reach: number };
