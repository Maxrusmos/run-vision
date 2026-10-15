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
