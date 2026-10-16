import type { StyleSpecification } from 'maplibre-gl';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type { ShareMapBase, ShareMapLayout, ShareMapSettings } from './activity-share.types';

/** Наклон карты в режиме 3D, градусы. */
export const SHARE_MAP_TILT_PITCH = 55;

export function createShareMapSettings(): ShareMapSettings {
  return { layout: 'block', base: 'light', tilted: false };
}

export const SHARE_MAP_LAYOUTS: readonly { id: ShareMapLayout; name: string }[] = [
  { id: 'block', name: 'Блок' },
  { id: 'full', name: 'Весь фон' },
];

export type ShareMapBaseOption = {
  id: ShareMapBase;
  name: string;
  /** Цвет превью в меню: живые тайлы там не рисуем. */
  preview: string;
};

export const SHARE_MAP_BASES: readonly ShareMapBaseOption[] = [
  { id: 'light', name: 'Светлая', preview: 'linear-gradient(135deg, #f4f4f2, #d6d6d3)' },
  { id: 'dark', name: 'Тёмная', preview: 'linear-gradient(135deg, #2b2d30, #46494d)' },
  { id: 'relief', name: 'Рельеф', preview: 'linear-gradient(135deg, #e9e4d6, #b8b09a)' },
  { id: 'satellite', name: 'Спутник', preview: 'linear-gradient(135deg, #2f4a2a, #6b7d4f)' },
];

type RasterBase = { tiles: string[]; tileSize: number; maxzoom: number };

const esri = (service: string, maxzoom: number): RasterBase => ({
  tiles: [
    `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`,
  ],
  tileSize: 256,
  maxzoom,
});

/**
 * Тайлы подложки — все с серверов Esri (отдают CORS, иначе карта не попадёт в PNG).
 * Простые подложки без подписей и мелких объектов: трек на них не теряется.
 */
const BASE_RASTERS: Record<ShareMapBase, RasterBase> = {
  light: esri('Canvas/World_Light_Gray_Base', 16),
  dark: esri('Canvas/World_Dark_Gray_Base', 16),
  // Отмывка рельефа без дорог; детальнее 13-го зума тайлов нет — дальше растягивается.
  relief: esri('World_Terrain_Base', 13),
  satellite: esri('World_Imagery', 19),
};

/** Стиль карты: только подложка, трек рисуется поверх SVG. */
export function createShareMapStyle(map: ShareMapSettings, background: string): StyleSpecification {
  return {
    version: 8,
    sources: { base: { type: 'raster', ...BASE_RASTERS[map.base] } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': background } },
      { id: 'base', type: 'raster', source: 'base' },
    ],
  };
}

/** Точки трека в виде [долгота, широта]. */
export function getRouteLngLats(track: ITrackPoint[]): [number, number][] {
  return track
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point): [number, number] => [point.longitude, point.latitude]);
}

/** Границы трека: [[запад, юг], [восток, север]]. */
export function getLngLatBounds(
  points: [number, number][],
): [[number, number], [number, number]] | null {
  if (!points.length) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}
