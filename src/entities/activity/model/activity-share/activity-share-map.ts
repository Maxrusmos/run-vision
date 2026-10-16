import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import type {
  ShareMapBase,
  ShareMapLayout,
  ShareMapSettings,
  ShareRouteStyle,
} from './activity-share.types';
import { findRouteStyle, type RouteLayerColor } from './activity-share-route-styles';

/** Наклон карты в режиме 3D, градусы. */
export const SHARE_MAP_TILT_PITCH = 55;
/** Во сколько раз рельеф выше настоящего: так холмы заметнее на маленькой карточке. */
const TERRAIN_EXAGGERATION = 1.6;

/** Базовая толщина линии и радиус точки старта — в единицах слоя трека (как в SVG-треке). */
const BASE_STROKE = 8;
const START_RADIUS = 11;
/** Пунктир в единицах толщины линии (в MapLibre шаг задаётся в толщинах). */
const DASH = { dash: [3, 2], dot: [0, 2] } as const;

export function createShareMapSettings(): ShareMapSettings {
  return {
    layout: 'block',
    base: 'light',
    detailed: false,
    terrain: true,
    tilted: false,
    view: null,
  };
}

export const SHARE_MAP_LAYOUTS: readonly { id: ShareMapLayout; name: string; icon: string }[] = [
  { id: 'block', name: 'Блок', icon: 'mdi-page-layout-header' },
  { id: 'full', name: 'Весь фон', icon: 'mdi-fullscreen' },
];

export type ShareMapBaseOption = {
  id: ShareMapBase;
  name: string;
  /** Цвет превью в меню: живые тайлы там не рисуем. */
  preview: string;
  /** Есть ли у подложки упрощённый вид без подписей. */
  canSimplify: boolean;
};

export const SHARE_MAP_BASES: readonly ShareMapBaseOption[] = [
  {
    id: 'light',
    name: 'Светлая',
    preview: 'linear-gradient(135deg, #f2efe9, #d7e6c8)',
    canSimplify: true,
  },
  {
    id: 'dark',
    name: 'Тёмная',
    preview: 'linear-gradient(135deg, #1c1f26, #3a4150)',
    canSimplify: true,
  },
  {
    id: 'topo',
    name: 'Топо',
    preview: 'linear-gradient(135deg, #e8e0c8, #9fbf86)',
    canSimplify: false,
  },
  {
    id: 'satellite',
    name: 'Спутник',
    preview: 'linear-gradient(135deg, #2f4a2a, #6b7d4f)',
    canSimplify: true,
  },
];

const CARTO = (style: string) =>
  ['a', 'b', 'c', 'd'].map(
    (sub) => `https://${sub}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}@2x.png`,
  );

const CARTO_ATTRIBUTION = '© OpenStreetMap © CARTO';

type RasterBase = { tiles: string[]; tileSize: number; maxzoom: number; attribution: string };

/** Тайлы подложки (все сервисы отдают CORS — иначе карта не попадёт в PNG). */
function getBaseRasters(base: ShareMapBase, detailed: boolean): RasterBase[] {
  switch (base) {
    case 'light':
      return [
        {
          tiles: CARTO(detailed ? 'voyager' : 'voyager_nolabels'),
          tileSize: 512,
          maxzoom: 20,
          attribution: CARTO_ATTRIBUTION,
        },
      ];
    case 'dark':
      return [
        {
          tiles: CARTO(detailed ? 'dark_all' : 'dark_nolabels'),
          tileSize: 512,
          maxzoom: 20,
          attribution: CARTO_ATTRIBUTION,
        },
      ];
    case 'topo':
      return [
        {
          tiles: ['a', 'b', 'c'].map(
            (sub) => `https://${sub}.tile.opentopomap.org/{z}/{x}/{y}.png`,
          ),
          tileSize: 256,
          maxzoom: 17,
          attribution: '© OpenStreetMap © OpenTopoMap',
        },
      ];
    case 'satellite': {
      const imagery: RasterBase = {
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© Esri',
      };
      // «Больше информации» на спутнике — подписи поверх снимка.
      return detailed
        ? [
            imagery,
            {
              tiles: CARTO('dark_only_labels'),
              tileSize: 512,
              maxzoom: 20,
              attribution: CARTO_ATTRIBUTION,
            },
          ]
        : [imagery];
    }
  }
}

/** Подпись источников карты — по их условиям она должна быть на изображении. */
export function getShareMapAttribution(map: ShareMapSettings): string {
  const names = getBaseRasters(map.base, map.detailed).flatMap((raster) =>
    raster.attribution.split('©').map((name) => name.trim()),
  );
  if (map.terrain) names.push('Mapzen');
  return [...new Set(names.filter(Boolean))].map((name) => `© ${name}`).join(' ');
}

const DEM_SOURCE: SourceSpecification = {
  type: 'raster-dem',
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
};

export type ShareMapRouteOptions = {
  visible: boolean;
  style: ShareRouteStyle;
  routeColor: string;
  textColor: string;
  backgroundColor: string;
  /** Сколько пикселей карты в одной единице слоя трека (ширина карточки = 1000). */
  unit: number;
};

/** Трек в GeoJSON: координаты — [долгота, широта]. */
export type RouteFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};

export function createRouteGeoJson(track: ITrackPoint[]): RouteFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: track
        .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        .map((point): [number, number] => [point.longitude, point.latitude]),
    },
  };
}

/** Границы трека: [[запад, юг], [восток, север]]. */
export function getRouteLngLatBounds(
  route: RouteFeature,
): [[number, number], [number, number]] | null {
  const coordinates = route.geometry.coordinates;
  if (!coordinates.length) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of coordinates) {
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

/**
 * Стиль трека из набора слоёв-копий (тех же, что у SVG-трека) → слои линии MapLibre.
 * Сдвиг копий — в пикселях экрана (`viewport`), поэтому при наклоне карты
 * объёмные стили остаются «стоящими».
 */
function createRouteLayers(options: ShareMapRouteOptions): LayerSpecification[] {
  if (!options.visible) return [];

  const { unit } = options;
  const resolveColor = (color: RouteLayerColor = 'route') => {
    if (color === 'route') return options.routeColor;
    if (color === 'text') return options.textColor;
    if (color === 'background') return options.backgroundColor;
    return color;
  };

  const layers: LayerSpecification[] = [];
  findRouteStyle(options.style).layers.forEach((layer, index) => {
    // Копии выдавливания: прозрачность делится между ними, чтобы грань
    // в итоге была не плотнее, чем у SVG-трека.
    const copies = layer.extrude
      ? Array.from({ length: layer.extrude.steps }, (_, step) => {
          const distance = layer.extrude!.steps - step;
          return { dx: layer.extrude!.dx * distance, dy: layer.extrude!.dy * distance };
        })
      : [{ dx: layer.dx ?? 0, dy: layer.dy ?? 0 }];
    const opacity = layer.extrude
      ? 1 - Math.pow(1 - (layer.opacity ?? 1), 3 / layer.extrude.steps)
      : (layer.opacity ?? 1);
    // Масштабированная копия («Призрак») на карте — более широкая полупрозрачная линия.
    const width = (layer.width ?? 1) * (1 + ((layer.scale ?? 1) - 1) * 12);

    copies.forEach((copy, copyIndex) => {
      layers.push({
        id: `route-${index}-${copyIndex}`,
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': BASE_STROKE * width * unit,
          'line-opacity': opacity,
          'line-translate': [copy.dx * unit, copy.dy * unit],
          'line-translate-anchor': 'viewport',
          ...(layer.gradient
            ? {
                'line-gradient': [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0,
                  options.routeColor,
                  1,
                  options.textColor,
                ],
              }
            : { 'line-color': resolveColor(layer.color) }),
          ...(layer.dash ? { 'line-dasharray': [...DASH[layer.dash]] } : {}),
        },
      });
    });
  });

  layers.push({
    id: 'route-start',
    type: 'circle',
    source: 'route-start',
    paint: { 'circle-radius': START_RADIUS * unit, 'circle-color': options.routeColor },
  });

  return layers;
}

/**
 * Полный стиль карты карточки. Пересобирается при любом изменении настроек —
 * MapLibre сам применяет только разницу.
 */
export function createShareMapStyle(
  map: ShareMapSettings,
  route: RouteFeature,
  routeOptions: ShareMapRouteOptions,
): StyleSpecification {
  const rasters = getBaseRasters(map.base, map.detailed);
  const sources: StyleSpecification['sources'] = {
    route: { type: 'geojson', data: route, lineMetrics: true },
    'route-start': {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: route.geometry.coordinates[0] ?? [0, 0] },
      },
    },
  };
  const layers: LayerSpecification[] = [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': routeOptions.backgroundColor },
    },
  ];

  rasters.forEach((raster, index) => {
    sources[`base-${index}`] = {
      type: 'raster',
      tiles: raster.tiles,
      tileSize: raster.tileSize,
      maxzoom: raster.maxzoom,
    };
    // Подписи — поверх теней рельефа, снимок/схема — под ними.
    if (index === 0) layers.push({ id: `base-${index}`, type: 'raster', source: `base-${index}` });
  });

  if (map.terrain) {
    // Для теней и объёма нужны разные источники (рекомендация MapLibre).
    sources.hillshade = { ...DEM_SOURCE };
    sources.terrain = { ...DEM_SOURCE };
    layers.push({
      id: 'hillshade',
      type: 'hillshade',
      source: 'hillshade',
      paint: {
        'hillshade-exaggeration': map.base === 'satellite' ? 0.25 : 0.5,
        'hillshade-shadow-color': map.base === 'dark' ? '#000000' : '#473b24',
        'hillshade-highlight-color': map.base === 'dark' ? '#5a6272' : '#ffffff',
      },
    });
  }

  rasters.slice(1).forEach((_, offset) => {
    const id = `base-${offset + 1}`;
    layers.push({ id, type: 'raster', source: id });
  });

  layers.push(...createRouteLayers(routeOptions));

  return {
    version: 8,
    sources,
    layers,
    // Объёмный рельеф — только при наклоне: сверху он не виден, а грузит лишнее.
    ...(map.terrain && map.tilted
      ? { terrain: { source: 'terrain', exaggeration: TERRAIN_EXAGGERATION } }
      : {}),
  };
}
