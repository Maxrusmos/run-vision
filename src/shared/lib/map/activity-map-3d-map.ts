import type { StyleSpecification } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';

export type ViewMode = '2d' | '3d';
export type MapStyle = 'map' | 'satellite';
export const MAP_2D_PITCH = 0;
export const MAP_3D_PITCH = 55;

export function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      map: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
      },
      satellite: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'map',
        type: 'raster',
        source: 'map',
        layout: {
          visibility: 'visible',
        },
      },
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: {
          visibility: 'none',
        },
      },
    ],
  };
}

export function setMapStyleVisibility(map: maplibregl.Map, style: MapStyle) {
  map.setLayoutProperty('satellite', 'visibility', style === 'satellite' ? 'visible' : 'none');
  map.setLayoutProperty('map', 'visibility', style === 'map' ? 'visible' : 'none');
}

export function setMapPitch(map: maplibregl.Map, mode: ViewMode) {
  map.easeTo({
    pitch: mode === '2d' ? MAP_2D_PITCH : MAP_3D_PITCH,
    duration: 500,
  });
}
