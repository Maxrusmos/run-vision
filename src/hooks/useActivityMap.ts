import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import * as maplibregl from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  createMapStyle,
  MAP_2D_PITCH,
  MAP_3D_PITCH,
  setMapPitch,
  setMapStyleVisibility,
  type MapStyle,
  type ViewMode,
} from '../shared/lib/map/activity-map-3d-map.ts';
import {
  createFinishMarker,
  createPlaybackMarker,
  createStartMarker,
} from '../shared/lib/map/activity-map-3d-markers.ts';
import { trackToCoordinates } from '@/shared/lib/map/map.ts';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import { createCameraController } from '@/entities/activity/model/activity-map-3d-camera.ts';
import type { PlaybackCoordinate } from '@/entities/activity/model/activity-playback-3d.ts';
import { getBearing } from '@/entities/activity/model/activity-map-3d-camera.ts';
import { getPlaybackPosition } from '@/entities/activity/model/activity-playback-3d.ts';

maplibregl.setWorkerUrl(maplibreWorker);

type CameraController = ReturnType<typeof createCameraController>;

export function useActivityMap3D(activity: IActivity, mapContainer: Ref<HTMLDivElement | null>) {
  const viewMode = ref<ViewMode>('3d');
  const mapStyle = ref<MapStyle>('map');
  const followCamera = ref(false);
  let map: maplibregl.Map | null = null;
  let camera: CameraController | null = null;
  let playbackMarker: maplibregl.Marker | null = null;
  let startMarker: maplibregl.Marker | null = null;
  let finishMarker: maplibregl.Marker | null = null;
  let coordinates: PlaybackCoordinate[] = [];

  function updateElapsedRoute(currentIndex: number, currentCoordinate: PlaybackCoordinate) {
    if (!map) {
      return;
    }

    const source = map.getSource('elapsed-route') as maplibregl.GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    const elapsedCoordinates = [...coordinates.slice(0, currentIndex + 1), currentCoordinate];

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates:
          elapsedCoordinates.length > 1
            ? elapsedCoordinates
            : [currentCoordinate, currentCoordinate],
      },
    });
  }

  function updateCamera(currentIndex: number, currentCoordinate: PlaybackCoordinate) {
    if (!map || !camera || !followCamera.value) {
      return;
    }
    const previousCoordinate = coordinates[Math.max(currentIndex - 1, 0)];
    const nextCoordinate = coordinates[Math.min(currentIndex + 1, coordinates.length - 1)];
    if (!previousCoordinate || !nextCoordinate) {
      return;
    }
    if (previousCoordinate === nextCoordinate) {
      return;
    }
    const bearing = getBearing(previousCoordinate, nextCoordinate);
    camera.setTarget(currentCoordinate, bearing, getCurrentPitch());
  }

  function initializeRoute() {
    if (!map || coordinates.length === 0) {
      return;
    }

    const firstCoordinate = coordinates[0];
    const lastCoordinate = coordinates[coordinates.length - 1];

    if (!firstCoordinate || !lastCoordinate) {
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
        'line-color': '#607D8B',
        'line-width': 4,
        'line-opacity': 0.95,
      },
    });

    map.addSource('elapsed-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [firstCoordinate, firstCoordinate],
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
        'line-width': 6,
        'line-opacity': 1,
      },
    });

    startMarker = createStartMarker(map, firstCoordinate);
    finishMarker = createFinishMarker(map, lastCoordinate);
    playbackMarker = createPlaybackMarker(map, firstCoordinate);
  }

  function initializeMap() {
    if (!mapContainer.value) {
      return;
    }

    coordinates = trackToCoordinates(activity.track);

    if (coordinates.length === 0) {
      return;
    }

    const firstCoordinate = coordinates[0];

    if (!firstCoordinate) {
      return;
    }

    map = new maplibregl.Map({
      container: mapContainer.value,
      style: createMapStyle(),
      center: firstCoordinate,
      zoom: 16.8,
      pitch: MAP_3D_PITCH,
      bearing: 0,
      renderWorldCopies: false,
    });

    camera = createCameraController(map, {
      smoothing: 8,
      bearingSmoothing: 4,
      bearingThreshold: 70,
      zoom: 15,
    });

    map.on('load', initializeRoute);
  }

  function setPlaybackTime(seconds: number) {
    if (!map || !playbackMarker) {
      return;
    }
    const playbackPosition = getPlaybackPosition(activity, seconds, coordinates);
    if (!playbackPosition) {
      return;
    }
    const { coordinate, index } = playbackPosition;
    playbackMarker.setLngLat(coordinate);
    updateElapsedRoute(index, coordinate);
    updateCamera(index, coordinate);
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode;
    if (!map) {
      return;
    }
    setMapPitch(map, mode);
    if (followCamera.value && camera) {
      camera.setCurrentTarget(getCurrentPitch());
    }
  }

  function setMapStyle(style: MapStyle) {
    mapStyle.value = style;
    if (!map) {
      return;
    }
    setMapStyleVisibility(map, style);
  }

  function getCurrentPitch() {
    return viewMode.value === '2d' ? MAP_2D_PITCH : MAP_3D_PITCH;
  }

  function setFollowCamera(enabled: boolean) {
    followCamera.value = enabled;
    if (!camera || !map) {
      return;
    }
    if (!enabled) {
      camera.disable();
      return;
    }
    camera.setCurrentTarget(getCurrentPitch());
    camera.enable();
  }

  onMounted(initializeMap);
  onBeforeUnmount(() => {
    camera?.destroy();
    playbackMarker?.remove();
    startMarker?.remove();
    finishMarker?.remove();
    map?.remove();
    camera = null;
    playbackMarker = null;
    startMarker = null;
    finishMarker = null;
    map = null;
    coordinates = [];
  });

  return {
    viewMode,
    mapStyle,
    followCamera,
    setPlaybackTime,
    setViewMode,
    setMapStyle,
    setFollowCamera,
  };
}
