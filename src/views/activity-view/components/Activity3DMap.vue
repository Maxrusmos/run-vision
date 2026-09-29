<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as maplibregl from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { IActivity } from '@/entities/activity/model/activity.types';
import {
  getPlaybackPosition,
  type PlaybackCoordinate,
} from '@/entities/activity/model/activity-playback-3d.ts';
import { trackToCoordinates } from '@/shared/lib/map/map';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  createCameraController,
  getBearing,
} from '@/entities/activity/model/activity-map-3d-camera.ts';

maplibregl.setWorkerUrl(maplibreWorker);

type Props = {
  activity: IActivity;
};

const props = defineProps<Props>();
const mapContainer = ref<HTMLDivElement | null>(null);
let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;
let camera: ReturnType<typeof createCameraController> | null = null;
const mapMode = ref<'satellite' | 'map'>('map');
const followCamera = ref(false);

function createMapStyle(): maplibregl.StyleSpecification {
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

function createMarker(coordinate: maplibregl.LngLatLike) {
  if (!map) return;

  const markerElement = document.createElement('div');
  markerElement.className = 'activity-marker';

  marker = new maplibregl.Marker({
    element: markerElement,
    anchor: 'center',
  })
    .setLngLat(coordinate)
    .addTo(map);
}

function setMapMode(mode: 'satellite' | 'map') {
  mapMode.value = mode;
  if (!map) return;
  map.setLayoutProperty('satellite', 'visibility', mode === 'satellite' ? 'visible' : 'none');
  map.setLayoutProperty('map', 'visibility', mode === 'map' ? 'visible' : 'none');
}

function setFollowCamera(enabled: boolean) {
  followCamera.value = enabled;
  if (!camera || !map) return;
  if (!enabled) {
    camera.disable();
    return;
  }
  camera.setCurrentTarget();
  camera.enable();
}

function toggleFollowCamera() {
  setFollowCamera(!followCamera.value);
}

function updateElapsedRoute(
  coordinates: PlaybackCoordinate[],
  currentIndex: number,
  currentCoordinate: PlaybackCoordinate,
) {
  if (!map) return;
  const elapsedSource = map.getSource('elapsed-route') as maplibregl.GeoJSONSource | undefined;
  if (!elapsedSource) return;
  const elapsedCoordinates = [...coordinates.slice(0, currentIndex + 1), currentCoordinate];

  elapsedSource.setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates:
        elapsedCoordinates.length > 1 ? elapsedCoordinates : [currentCoordinate, currentCoordinate],
    },
  });
}

function updateCamera(
  coordinates: PlaybackCoordinate[],
  currentIndex: number,
  currentCoordinate: PlaybackCoordinate,
) {
  if (!camera || !followCamera.value) return;
  const previousCoordinate = coordinates[Math.max(currentIndex - 1, 0)];
  const nextCoordinate = coordinates[Math.min(currentIndex + 1, coordinates.length - 1)];
  if (!previousCoordinate || !nextCoordinate) {
    return;
  }
  if (previousCoordinate === nextCoordinate) {
    return;
  }
  const bearing = getBearing(previousCoordinate, nextCoordinate);
  camera.setTarget(currentCoordinate, bearing);
}

onMounted(() => {
  if (!mapContainer.value) return;
  const coordinates = trackToCoordinates(props.activity.track);
  if (coordinates.length === 0) return;
  const firstCoordinate = coordinates[0];
  if (!firstCoordinate) return;
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: createMapStyle(),
    center: firstCoordinate,
    zoom: 16.8,
    pitch: 55,
    bearing: 0,
    renderWorldCopies: false,
  });

  camera = createCameraController(map, {
    smoothing: 8,
    bearingSmoothing: 4,
    bearingThreshold: 45,
    pitch: 68,
    zoom: 15,
  });

  map.on('load', () => {
    if (!map) return;

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
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
        'line-color': '#BDBDBD',
        'line-width': 6,
        'line-opacity': 0.9,
      },
    });

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
        'line-opacity': 0.95,
      },
    });

    createMarker(firstCoordinate);
  });
});

function setPlaybackTime(seconds: number) {
  if (!map || !marker) return;

  const coordinates = trackToCoordinates(props.activity.track);

  if (coordinates.length === 0) return;

  const playbackPosition = getPlaybackPosition(props.activity, seconds, coordinates);

  if (!playbackPosition) return;

  const { coordinate, index } = playbackPosition;

  marker.setLngLat(coordinate);

  updateElapsedRoute(coordinates, index, coordinate);

  updateCamera(coordinates, index, coordinate);
}

defineExpose({
  setPlaybackTime,
  setFollowCamera,
  toggleFollowCamera,
});

onBeforeUnmount(() => {
  camera?.destroy();
  marker?.remove();
  map?.remove();

  camera = null;
  marker = null;
  map = null;
});
</script>

<template>
  <div class="activity-map-3d-wrapper">
    <div ref="mapContainer" class="activity-map-3d" />

    <div class="map-controls">
      <v-btn
        :color="followCamera ? '' : undefined"
        :variant="'flat'"
        class="toggle-camera-mode"
        @click="toggleFollowCamera"
      >
        {{ followCamera ? 'Камера' : 'Следить' }}
      </v-btn>

      <v-btn-toggle
        :model-value="mapMode"
        mandatory
        density="comfortable"
        divided
        @update:model-value="setMapMode"
      >
        <v-btn value="map" size="small"> Схема </v-btn>

        <v-btn value="satellite" size="small"> Спутник </v-btn>
      </v-btn-toggle>
    </div>
  </div>
</template>

<style scoped>
.activity-map-3d-wrapper {
  position: relative;
  width: 100%;
}

.activity-map-3d {
  width: 100%;
  height: 561px;
  overflow: hidden;
  border-radius: 10px;
}

.map-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.maplibregl-ctrl) {
  display: none !important;
}

.toggle-camera-mode {
  min-width: 110px;
}
</style>
