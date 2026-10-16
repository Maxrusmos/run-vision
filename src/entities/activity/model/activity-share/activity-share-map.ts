import type { StyleSpecification } from 'maplibre-gl';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import { getDistanceMeters } from '@/entities/activity/model/elevation-profile';
import type {
  ShareMapLayout,
  ShareMapPitch,
  ShareMapSettings,
  ShareMapStyle,
} from './activity-share.types';

/** Угол поворота в диапазоне [0, 360); у самого севера прилипает к 0. */
export function normalizeMapBearing(bearing: number): number {
  const value = ((Math.round(bearing) % 360) + 360) % 360;
  return value <= 3 || value >= 357 ? 0 : value;
}

/** Поля, в которые трек не заходит, в долях ширины/высоты карты. */
export type MapFitPadding = { top: number; right: number; bottom: number; left: number };

export function createShareMapSettings(): ShareMapSettings {
  return {
    layout: 'block',
    style: 'light',
    pitch: 0,
    bearing: 0,
    kmMarkers: true,
    startFinish: true,
  };
}

export const SHARE_MAP_LAYOUTS: readonly { id: ShareMapLayout; name: string }[] = [
  { id: 'block', name: 'Блок' },
  { id: 'full', name: 'Весь фон' },
];

/**
 * Наклон: 35° — заметный объём, трек ещё почти без искажений;
 * 60° — предел MapLibre по умолчанию, сильная перспектива «с высоты полёта».
 */
export const SHARE_MAP_PITCHES: readonly ShareMapPitch[] = [0, 35, 60];
export const SHARE_MAP_MAX_PITCH = 60;

/** Обработка растра подложки (paint-свойства MapLibre). */
type RasterPaint = {
  saturation?: number;
  contrast?: number;
  brightnessMin?: number;
  brightnessMax?: number;
  opacity?: number;
};

export type ShareMapStyleOption = {
  id: ShareMapStyle;
  name: string;
  /** Сервис Esri (server.arcgisonline.com) — отдаёт CORS, иначе карта не попадёт в PNG. */
  service: string;
  maxzoom: number;
  paint?: RasterPaint;
  /** Цвет под полупрозрачной подложкой: 'card' — фон карточки. */
  background?: 'card' | `#${string}`;
  /** CSS-фильтр превью в меню — приближение paint (живую карту там не рисуем). */
  previewFilter?: string;
};

const LIGHT = 'Canvas/World_Light_Gray_Base';
const DARK = 'Canvas/World_Dark_Gray_Base';
const IMAGERY = 'World_Imagery';

/**
 * Стили карты. Подложки нарочно простые (без подписей и мелочи) — трек не теряется.
 * Вариации — обработкой растра: тонирование в цвет фона, инверсия, ч/б.
 */
export const SHARE_MAP_STYLES: readonly ShareMapStyleOption[] = [
  { id: 'light', name: 'Светлая', service: LIGHT, maxzoom: 16 },
  { id: 'dark', name: 'Тёмная', service: DARK, maxzoom: 16 },
  {
    id: 'tinted',
    name: 'В тон',
    service: LIGHT,
    maxzoom: 16,
    paint: { saturation: -1, opacity: 0.4 },
    background: 'card',
    previewFilter: 'grayscale(1)',
  },
  {
    id: 'night',
    name: 'Ночь',
    service: DARK,
    maxzoom: 16,
    paint: { opacity: 0.55 },
    background: 'card',
  },
  {
    id: 'blueprint',
    name: 'Чертёж',
    service: LIGHT,
    maxzoom: 16,
    // brightness-min > brightness-max инвертирует растр: тёмный фон, светлые улицы.
    paint: { brightnessMin: 1, brightnessMax: 0, opacity: 0.5 },
    background: '#173a6a',
    previewFilter: 'invert(1)',
  },
  {
    id: 'vintage',
    name: 'Винтаж',
    service: LIGHT,
    maxzoom: 16,
    paint: { contrast: 0.15, opacity: 0.55 },
    background: '#e6d6b4',
    previewFilter: 'contrast(1.15)',
  },
  { id: 'satellite', name: 'Спутник', service: IMAGERY, maxzoom: 19 },
  {
    id: 'satellite-mono',
    name: 'Спутник ч/б',
    service: IMAGERY,
    maxzoom: 19,
    paint: { saturation: -1, contrast: 0.15 },
    previewFilter: 'grayscale(1) contrast(1.15)',
  },
  {
    id: 'satellite-dark',
    name: 'Спутник ночь',
    service: IMAGERY,
    maxzoom: 19,
    paint: { saturation: -0.4, brightnessMax: 0.45 },
    previewFilter: 'saturate(0.6) brightness(0.45)',
  },
  {
    id: 'satellite-tinted',
    name: 'Спутник в тон',
    service: IMAGERY,
    maxzoom: 19,
    paint: { saturation: -1, opacity: 0.45 },
    background: 'card',
    previewFilter: 'grayscale(1)',
  },
];

export function findShareMapStyle(id: ShareMapStyle): ShareMapStyleOption {
  return SHARE_MAP_STYLES.find((style) => style.id === id) ?? SHARE_MAP_STYLES[0]!;
}

function tileUrl(service: string): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;
}

/** Цвет под подложкой: свой у стиля, фон карточки или он же по умолчанию. */
export function getShareMapBackground(style: ShareMapStyleOption, cardBackground: string): string {
  return style.background && style.background !== 'card' ? style.background : cardBackground;
}

/** Стиль карты для MapLibre: фон и подложка; трек рисуется поверх SVG. */
export function createShareMapStyle(
  map: ShareMapSettings,
  cardBackground: string,
): StyleSpecification {
  const style = findShareMapStyle(map.style);
  const paint = style.paint ?? {};

  return {
    version: 8,
    sources: {
      base: {
        type: 'raster',
        tiles: [tileUrl(style.service)],
        tileSize: 256,
        maxzoom: style.maxzoom,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': getShareMapBackground(style, cardBackground) },
      },
      {
        id: 'base',
        type: 'raster',
        source: 'base',
        paint: {
          'raster-saturation': paint.saturation ?? 0,
          'raster-contrast': paint.contrast ?? 0,
          'raster-brightness-min': paint.brightnessMin ?? 0,
          'raster-brightness-max': paint.brightnessMax ?? 1,
          'raster-opacity': paint.opacity ?? 1,
        },
      },
    ],
  };
}

/** Тайл подложки с местом тренировки — превью стиля в меню. */
export function getShareMapPreviewUrl(
  style: ShareMapStyleOption,
  center: [lng: number, lat: number],
  zoom = 13,
): string {
  const scale = 2 ** zoom;
  const x = Math.floor(((center[0] + 180) / 360) * scale);
  const latRad = (center[1] * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  );
  return tileUrl(style.service)
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
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

/** Шаги отметок, км: берём наименьший, при котором флажков не больше MAX_KM_MARKERS. */
const KM_MARKER_STEPS = [1, 2, 5, 10, 20, 50, 100] as const;
const MAX_KM_MARKERS = 6;
/** Отметку у самого финиша не ставим — она слипнется с флажком финиша. */
const FINISH_CLEARANCE = 0.35;
/** Старт и финиш ближе этого — круговой маршрут. */
const LOOP_DISTANCE_METERS = 150;

/**
 * Шаг отметок километров по длине трека: 5 км → каждый километр,
 * 20 км → каждые 5, марафон → каждые 10. Так флажки не перегружают карту.
 */
export function getKmMarkerStep(distanceKm: number): number {
  return KM_MARKER_STEPS.find((step) => Math.floor(distanceKm / step) <= MAX_KM_MARKERS) ?? 100;
}

export type RouteKmMarker = {
  km: number;
  lngLat: [number, number];
};

/** Точки трека на каждом `step`-м километре (интерполяция между точками GPX). */
export function getKmMarkers(track: ITrackPoint[], step?: number): RouteKmMarker[] {
  const points = track.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const distances = [0];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    distances.push(
      distances[index - 1]! + getDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude),
    );
  }

  const totalKm = (distances[distances.length - 1] ?? 0) / 1000;
  const markerStep = step ?? getKmMarkerStep(totalKm);
  const markers: RouteKmMarker[] = [];

  let cursor = 0;
  for (let km = markerStep; km <= totalKm - markerStep * FINISH_CLEARANCE; km += markerStep) {
    const target = km * 1000;
    while (cursor < distances.length - 2 && distances[cursor + 1]! < target) cursor++;
    const a = points[cursor]!;
    const b = points[cursor + 1] ?? a;
    const span = distances[cursor + 1]! - distances[cursor]!;
    const t = span > 0 ? (target - distances[cursor]!) / span : 0;
    markers.push({
      km,
      lngLat: [
        a.longitude + (b.longitude - a.longitude) * t,
        a.latitude + (b.latitude - a.latitude) * t,
      ],
    });
  }

  return markers;
}

/** Круговой маршрут: финиш рядом со стартом. */
export function isLoopRoute(lngLats: [number, number][]): boolean {
  const start = lngLats[0];
  const finish = lngLats[lngLats.length - 1];
  if (!start || !finish || lngLats.length < 2) return false;
  return getDistanceMeters(start[1], start[0], finish[1], finish[0]) < LOOP_DISTANCE_METERS;
}
