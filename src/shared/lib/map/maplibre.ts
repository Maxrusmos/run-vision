import * as maplibregl from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Без явного адреса воркера MapLibre не грузит тайлы под Vite.
maplibregl.setWorkerUrl(maplibreWorker);

export { maplibregl };
