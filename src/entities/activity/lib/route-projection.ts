import type { ITrackPoint } from '@/entities/activity/model/activity.types';

export type RoutePoint = {
  x: number;
  y: number;
};

export type RouteViewport = {
  width: number;
  height: number;
  padding: number;
};

function isValidPoint(point: ITrackPoint): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

/**
 * Проецирует трек в прямоугольник SVG с сохранением пропорций маршрута.
 * Долгота масштабируется на cos(широты), чтобы маршрут не растягивался по горизонтали.
 */
export function projectRoute(track: ITrackPoint[], viewport: RouteViewport): RoutePoint[] {
  const points = track.filter(isValidPoint);

  if (!points.length) {
    return [];
  }

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  // Цикл вместо Math.min(...array): спред падает на очень длинных треках.
  for (const point of points) {
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }

  const midLat = (minLat + maxLat) / 2;
  const longitudeScale = Math.max(Math.cos((midLat * Math.PI) / 180), 0.01);
  const rawWidth = Math.max((maxLon - minLon) * longitudeScale, 1e-9);
  const rawHeight = Math.max(maxLat - minLat, 1e-9);

  const availableWidth = viewport.width - viewport.padding * 2;
  const availableHeight = viewport.height - viewport.padding * 2;
  const scale = Math.min(availableWidth / rawWidth, availableHeight / rawHeight);

  const offsetX = (viewport.width - rawWidth * scale) / 2;
  const offsetY = (viewport.height - rawHeight * scale) / 2;

  return points.map((point) => ({
    x: offsetX + (point.longitude - minLon) * longitudeScale * scale,
    y: viewport.height - offsetY - (point.latitude - minLat) * scale,
  }));
}

export function toSvgPolylinePoints(points: RoutePoint[]): string {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

export type RouteBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function getRouteBounds(points: RoutePoint[]): RouteBounds | null {
  if (!points.length) return null;

  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  for (const { x, y } of points) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  }

  return bounds;
}

/** Поворот и наклон трека (без карты): угол как у карты — больше угол, трек против часовой. */
export type RouteOrientation = {
  bearing: number;
  /** Наклон «плоскости» трека от себя, в градусах (0 — вид сверху). */
  pitch: number;
};

/** Расстояние до «камеры» в радиусах трека: чем меньше, тем сильнее перспектива. */
const ORIENT_CAMERA_DISTANCE = 3;

/**
 * Поворачивает и наклоняет трек (точки относительно центра) и снова вписывает его
 * в область `width × height` с отступом: повёрнутый трек занимает то же место.
 * Считается в JS, а не CSS 3D — чтобы картинка при экспорте совпала с экраном.
 */
export function orientRoute(
  points: readonly RoutePoint[],
  orientation: RouteOrientation,
  viewport: { width: number; height: number; padding: number },
): RoutePoint[] {
  if (!points.length || (!orientation.bearing && !orientation.pitch)) return [...points];

  const angle = (-orientation.bearing * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tilt = (orientation.pitch * Math.PI) / 180;

  let radius = 0;
  const rotated = points.map(({ x, y }) => {
    const point = { x: x * cos - y * sin, y: x * sin + y * cos };
    radius = Math.max(radius, Math.hypot(point.x, point.y));
    return point;
  });

  // Наклон: верх уходит от зрителя — сжимается по высоте и уменьшается перспективой.
  const distance = Math.max(radius, 1e-9) * ORIENT_CAMERA_DISTANCE;
  const tilted = rotated.map(({ x, y }) => {
    const factor = distance / (distance - y * Math.sin(tilt));
    return { x: x * factor, y: y * Math.cos(tilt) * factor };
  });

  const bounds = getRouteBounds(tilted)!;
  const rawWidth = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const rawHeight = Math.max(bounds.maxY - bounds.minY, 1e-9);
  const scale = Math.min(
    (viewport.width - viewport.padding * 2) / rawWidth,
    (viewport.height - viewport.padding * 2) / rawHeight,
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return tilted.map(({ x, y }) => ({ x: (x - centerX) * scale, y: (y - centerY) * scale }));
}
