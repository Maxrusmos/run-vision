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

let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;

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
    style: 'https://tiles.openfreemap.org/styles/bright',
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
    markerElement.className = 'mdi mdi-run';
    markerElement.style.fontSize = '32px';
    markerElement.style.color = '#1976D2';
    marker = new maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
    })
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
  <div ref="mapContainer" class="activity-map" />
</template>

<style scoped>
.activity-map {
  width: 100%;
  height: 500px;
  overflow: hidden;
  border-radius: 12px;
}

:deep(.maplibregl-ctrl) {
  display: none !important;
}
</style>
