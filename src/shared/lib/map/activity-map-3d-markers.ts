import * as maplibregl from 'maplibre-gl';

function createMarkerElement(className: string, styles: Partial<CSSStyleDeclaration>) {
  const element = document.createElement('div');
  element.className = className;
  Object.assign(element.style, {
    pointerEvents: 'none',
    userSelect: 'none',
    ...styles,
  });

  return element;
}

function createIcon(className: string, styles: Partial<CSSStyleDeclaration>) {
  const icon = document.createElement('span');
  icon.className = className;
  Object.assign(icon.style, styles);
  return icon;
}

export function createPlaybackMarker(map: maplibregl.Map, coordinate: maplibregl.LngLatLike) {
  const element = createMarkerElement('activity-marker activity-marker--playback', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    width: '22px',
    height: '22px',
    background: '#fff',
    border: '3px solid #1976d2',
    borderRadius: '50%',
    boxShadow: '0 2px 6px rgb(0 0 0 / 35%), 0 0 0 2px rgb(255 255 255 / 70%)',
  });

  const icon = createIcon('mdi mdi-run', {
    color: '#1976d2',
    fontSize: '14px',
    lineHeight: '1',
  });

  element.appendChild(icon);

  return new maplibregl.Marker({
    element,
    anchor: 'center',
  })
    .setLngLat(coordinate)
    .addTo(map);
}

export function createStartMarker(map: maplibregl.Map, coordinate: maplibregl.LngLatLike) {
  const element = createMarkerElement('activity-marker activity-marker--start', {});

  const icon = createIcon('mdi mdi-flag', {
    color: '#4E6475',
    fontSize: '32px',
  });

  element.appendChild(icon);
  return new maplibregl.Marker({
    element,
    anchor: 'bottom',
  })
    .setLngLat(coordinate)
    .addTo(map);
}

export function createFinishMarker(map: maplibregl.Map, coordinate: maplibregl.LngLatLike) {
  const element = createMarkerElement('activity-marker activity-marker--finish', {});
  const icon = createIcon('mdi mdi-flag-checkered', {
    color: '#4E6475',
    fontSize: '32px',
  });
  element.appendChild(icon);
  return new maplibregl.Marker({
    element,
    anchor: 'bottom',
  })
    .setLngLat(coordinate)
    .addTo(map);
}
