<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as maplibregl from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { IActivity } from '@/entities/activity/model/activity.types';
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
const mapMode = ref<'satellite' | 'map'>('map');

let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;

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

function setMapMode(mode: 'satellite' | 'map') {
  mapMode.value = mode;
  if (!map) {
    return;
  }
  map.setLayoutProperty('map', 'visibility', mode === 'map' ? 'visible' : 'none');
  map.setLayoutProperty('satellite', 'visibility', mode === 'satellite' ? 'visible' : 'none');
}

onMounted(() => {
  if (!mapContainer.value || props.activity.track.length === 0) {
    return;
  }

  const firstPoint = props.activity.track[0];

  if (!firstPoint) {
    return;
  }

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: createMapStyle(),
    center: [firstPoint.longitude, firstPoint.latitude],
    zoom: 13,
  });

  map.on('load', () => {
    if (!map) {
      return;
    }

    const coordinates = trackToCoordinates(props.activity.track);
    const firstCoordinate = coordinates[0];

    if (!firstCoordinate) {
      return;
    }

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
        'line-width': 4,
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
        'line-width': 5,
      },
    });

    map.fitBounds(getTrackBounds(coordinates), {
      padding: 40,
    });

    const markerElement = document.createElement('div');
    markerElement.className = 'activity-marker';
    marker = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
      .setLngLat(firstCoordinate)
      .addTo(map);
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
  marker.setLngLat(currentCoordinate);
  const source = map.getSource('elapsed-route') as maplibregl.GeoJSONSource | undefined;

  if (!source) {
    return;
  }

  source.setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  });
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
  <div class="activity-map-wrapper">
    <div ref="mapContainer" class="activity-map" />

    <div class="map-switch">
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
.activity-map-wrapper {
  position: relative;
  width: 100%;
}

.activity-map {
  width: 100%;
  height: 561px;
  overflow: hidden;
  border-radius: 10px;
}

.map-switch {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

:deep(.maplibregl-ctrl) {
  display: none !important;
}
</style>
