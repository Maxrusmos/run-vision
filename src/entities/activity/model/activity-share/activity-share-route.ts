import type { RouteBounds } from '@/entities/activity/lib/route-projection';
import type { ShareRouteOffset, ShareRouteSize } from './activity-share.types';

/** Область трека в единицах viewBox (соотношение 2:1). */
export const ROUTE_VIEWPORT = { width: 600, height: 300, padding: 24 } as const;

export const DEFAULT_ROUTE_SIZE: ShareRouteSize = 'large';

export const ROUTE_SIZE_SCALE: Record<ShareRouteSize, number> = {
  small: 0.55,
  medium: 0.775,
  large: 1,
};

export const ROUTE_SIZE_OPTIONS: readonly {
  value: ShareRouteSize;
  label: string;
  title: string;
}[] = [
  { value: 'small', label: 'S', title: 'Маленький трек' },
  { value: 'medium', label: 'M', title: 'Средний трек' },
  { value: 'large', label: 'L', title: 'Большой трек' },
];

/** Отступ от края области, за который трек нельзя вытащить. */
const ROUTE_EDGE_MARGIN = 8;

/**
 * Ограничивает смещение, чтобы масштабированный трек оставался внутри своей области.
 * `bounds` — границы трека в масштабе 1, центрированного в области.
 */
export function clampRouteOffset(
  offset: ShareRouteOffset,
  bounds: RouteBounds,
  scale: number,
): ShareRouteOffset {
  const centerX = ROUTE_VIEWPORT.width / 2;
  const centerY = ROUTE_VIEWPORT.height / 2;
  const halfWidth = ((bounds.maxX - bounds.minX) * scale) / 2;
  const halfHeight = ((bounds.maxY - bounds.minY) * scale) / 2;
  const boundsCenterX = centerX + ((bounds.minX + bounds.maxX) / 2 - centerX) * scale;
  const boundsCenterY = centerY + ((bounds.minY + bounds.maxY) / 2 - centerY) * scale;

  const clampAxis = (value: number, center: number, half: number, size: number) => {
    const min = ROUTE_EDGE_MARGIN + half - center;
    const max = size - ROUTE_EDGE_MARGIN - half - center;
    // Если трек шире области по этой оси — двигать некуда.
    return min > max ? 0 : Math.min(max, Math.max(min, value));
  };

  return {
    x: clampAxis(offset.x, boundsCenterX, halfWidth, ROUTE_VIEWPORT.width),
    y: clampAxis(offset.y, boundsCenterY, halfHeight, ROUTE_VIEWPORT.height),
  };
}
