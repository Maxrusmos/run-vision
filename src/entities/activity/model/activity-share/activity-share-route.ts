import type { RouteBounds } from '@/entities/activity/lib/route-projection';
import type { ShareRoutePosition } from './activity-share.types';

/** Ширина слоя трека в условных единицах; высота считается по пропорциям слоя. */
export const ROUTE_LAYER_WIDTH = 1000;

/** Высота места под трек относительно ширины контента карточки. */
export const ROUTE_SLOT_HEIGHT_RATIO = 3 / 5;

/** Масштаб трека относительно места под трек: 1 — заполняет его целиком. */
export const DEFAULT_ROUTE_SCALE = 1;
export const MIN_ROUTE_SCALE = 0.35;
/** Верхняя граница; фактически масштаб ещё ограничен размером слоя. */
export const MAX_ROUTE_SCALE = 3;

/** Отступ от края слоя, за который трек нельзя вытащить. */
const ROUTE_EDGE_MARGIN = 12;

export type RouteLayerSize = {
  width: number;
  height: number;
};

function getHalfSize(bounds: RouteBounds) {
  return {
    halfWidth: (bounds.maxX - bounds.minX) / 2,
    halfHeight: (bounds.maxY - bounds.minY) / 2,
  };
}

/**
 * Итоговый масштаб: заданный, но в допустимых пределах и не больше, чем помещается в слой.
 */
export function getRouteScale(scale: number, bounds: RouteBounds, layer: RouteLayerSize) {
  const { halfWidth, halfHeight } = getHalfSize(bounds);
  const maxScaleX = halfWidth > 0 ? (layer.width / 2 - ROUTE_EDGE_MARGIN) / halfWidth : Infinity;
  const maxScaleY = halfHeight > 0 ? (layer.height / 2 - ROUTE_EDGE_MARGIN) / halfHeight : Infinity;

  const maxScale = Math.min(MAX_ROUTE_SCALE, maxScaleX, maxScaleY);
  return Math.max(Math.min(MIN_ROUTE_SCALE, maxScale), Math.min(scale, maxScale));
}

/**
 * Ограничивает центр трека так, чтобы трек целиком оставался внутри слоя.
 * `bounds` — границы трека в масштабе 1 относительно его центра.
 */
export function clampRoutePosition(
  position: ShareRoutePosition,
  bounds: RouteBounds,
  scale: number,
  layer: RouteLayerSize,
): ShareRoutePosition {
  const { halfWidth, halfHeight } = getHalfSize(bounds);

  const clampAxis = (value: number, half: number, size: number) => {
    const min = ROUTE_EDGE_MARGIN + half * scale;
    const max = size - ROUTE_EDGE_MARGIN - half * scale;
    return min > max ? size / 2 : Math.min(max, Math.max(min, value));
  };

  return {
    x: clampAxis(position.x, halfWidth, layer.width),
    y: clampAxis(position.y, halfHeight, layer.height),
  };
}
