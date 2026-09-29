<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as maplibregl from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import type { IActivity } from '@/entities/activity/model/activity.types';
import {
  buildElevationPoints,
  getElevationColor,
  getElevationStats,
} from '@/entities/activity/model/elevation-profile';
import {
  getElapsedTrackCoordinates,
  getTrackBounds,
  trackToCoordinates,
} from '@/shared/lib/map/map';

import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(maplibreWorker);

type Props = {
  activity: IActivity;
};

const props = defineProps<Props>();

const mapContainer = ref<HTMLDivElement | null>(null);

let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;

const elevationStats = getElevationStats(buildElevationPoints(props.activity.track));

function getBearing(from: maplibregl.LngLatLike, to: maplibregl.LngLatLike): number {
  const start = maplibregl.LngLat.convert(from);
  const end = maplibregl.LngLat.convert(to);

  const startLatitude = (start.lat * Math.PI) / 180;
  const endLatitude = (end.lat * Math.PI) / 180;
  const longitudeDelta = ((end.lng - start.lng) * Math.PI) / 180;

  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);

  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function createRouteSegments() {
  const track = props.activity.track;

  return track
    .slice(0, -1)
    .map((point, index) => {
      const nextPoint = track[index + 1];

      if (!nextPoint) {
        return null;
      }

      const elevation = (point.elevation + nextPoint.elevation) / 2;

      return {
        type: 'Feature' as const,
        properties: {
          color: getElevationColor(
            elevation,
            elevationStats.minElevation,
            elevationStats.maxElevation,
          ),
          elevation,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [point.longitude, point.latitude],
            [nextPoint.longitude, nextPoint.latitude],
          ],
        },
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
}

function createTerrainSource() {
  if (!map) {
    return;
  }

  map.addSource('terrain', {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    tileSize: 256,
    encoding: 'terrarium',
    maxzoom: 15,
  });

  map.setTerrain({
    source: 'terrain',
    exaggeration: 1.25,
  });

  map.addLayer({
    id: 'terrain-hillshade',
    type: 'hillshade',
    source: 'terrain',
    paint: {
      'hillshade-exaggeration': 0.35,
      'hillshade-shadow-color': '#000000',
      'hillshade-highlight-color': '#ffffff',
      'hillshade-accent-color': '#888888',
    },
  });
}

function createMapLayers(coordinates: maplibregl.LngLatLike[]) {
  if (!map) {
    return;
  }

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: createRouteSegments(),
    },
  });

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 6,
      'line-opacity': 0.95,
      'line-z-offset': ['get', 'elevation'],
    },
  });

  const firstCoordinate = coordinates[0];

  if (!firstCoordinate) {
    return;
  }

  map.addSource('elapsed-route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [firstCoordinate],
      },
    },
  });

  map.addLayer({
    id: 'elapsed-route',
    type: 'line',
    source: 'elapsed-route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#1976D2',
      'line-width': 7,
      'line-opacity': 1,
    },
  });
}

function createMarker(coordinate: maplibregl.LngLatLike) {
  if (!map) {
    return;
  }

  const markerElement = document.createElement('div');

  markerElement.className = 'mdi mdi-run';
  markerElement.style.fontSize = '34px';
  markerElement.style.color = '#1976D2';
  markerElement.style.textShadow = '0 2px 5px rgba(0, 0, 0, 0.35)';

  marker = new maplibregl.Marker({
    element: markerElement,
    anchor: 'center',
  })
    .setLngLat(coordinate)
    .addTo(map);
}

function moveCamera(
  currentCoordinate: maplibregl.LngLatLike,
  previousCoordinate: maplibregl.LngLatLike | undefined,
) {
  if (!map) {
    return;
  }

  if (!previousCoordinate) {
    map.easeTo({
      center: currentCoordinate,
      pitch: 68,
      zoom: 16,
      duration: 500,
      essential: true,
    });

    return;
  }

  const bearing = getBearing(previousCoordinate, currentCoordinate);

  map.easeTo({
    center: currentCoordinate,
    bearing,
    pitch: 68,
    zoom: 16.5,
    duration: 250,
    essential: true,
  });
}

onMounted(() => {
  if (!mapContainer.value || props.activity.track.length === 0) {
    return;
  }

  const firstPoint = props.activity.track[0];

  if (!firstPoint) {
    return;
  }

  const coordinates = trackToCoordinates(props.activity.track);
  const firstCoordinate = coordinates[0];

  if (!firstCoordinate) {
    return;
  }

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [firstPoint.longitude, firstPoint.latitude],
    zoom: 13,
    pitch: 55,
    bearing: 0,
    antialias: true,
  });

  map.on('load', () => {
    if (!map) {
      return;
    }

    createTerrainSource();
    createMapLayers(coordinates);
    createMarker(firstCoordinate);

    map.fitBounds(getTrackBounds(coordinates), {
      padding: 80,
      pitch: 55,
      duration: 0,
    });
  });
});

function setPlaybackTime(seconds: number) {
  if (!map || !marker) {
    return;
  }

  const coordinates = getElapsedTrackCoordinates(props.activity.track, seconds);

  const currentCoordinate = coordinates[coordinates.length - 1];

  if (!currentCoordinate) {
    return;
  }

  const previousCoordinate = coordinates[coordinates.length - 2];

  marker.setLngLat(currentCoordinate);

  const source = map.getSource('elapsed-route') as maplibregl.GeoJSONSource | undefined;

  if (source) {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  moveCamera(currentCoordinate, previousCoordinate);
}

defineExpose({
  setPlaybackTime,
});

onBeforeUnmount(() => {
  marker?.remove();
  map?.remove();
  marker = null;
  map = null;
});
</script>

<template>
  <div ref="mapContainer" class="activity-map-3d" />
</template>

<style scoped>
.activity-map-3d {
  width: 100%;
  height: 561px;
  overflow: hidden;
  border-radius: 10px;
}

:deep(.maplibregl-ctrl) {
  display: none !important;
}
</style>
