import type { IElevationPoint, ITrackPoint } from './activity.types';

const EARTH_RADIUS_METERS = 6371000;

export type IElevationProfilePoint = {
  x: number;
  y: number;
};

export function buildElevationPoints(track: ITrackPoint[]): IElevationPoint[] {
  if (track.length === 0) {
    return [];
  }

  const result: IElevationPoint[] = [];
  let distanceMeters = 0;

  for (let index = 0; index < track.length; index += 1) {
    const point = track[index];
    const previousPoint = track[index - 1];

    if (!point) {
      continue;
    }

    if (previousPoint) {
      distanceMeters += getDistanceMeters(
        previousPoint.latitude,
        previousPoint.longitude,
        point.latitude,
        point.longitude,
      );
    }

    result.push({
      distanceMeters,
      elevation: point.elevation,
    });
  }

  return result;
}

export function getElevationRange(points: IElevationPoint[]): {
  min: number;
  max: number;
} {
  if (points.length === 0) {
    return {
      min: 0,
      max: 0,
    };
  }

  let min = points[0]?.elevation ?? 0;
  let max = points[0]?.elevation ?? 0;

  for (const point of points) {
    min = Math.min(min, point.elevation);
    max = Math.max(max, point.elevation);
  }

  return {
    min,
    max,
  };
}

export function getElevationSvgPoint(
  point: IElevationPoint,
  totalDistanceMeters: number,
  minElevation: number,
  maxElevation: number,
  width: number,
  height: number,
  padding: number,
): IElevationProfilePoint {
  const distanceRange = Math.max(totalDistanceMeters, 1);
  const elevationRange = Math.max(maxElevation - minElevation, 1);

  const x = padding + (point.distanceMeters / distanceRange) * (width - padding * 2);

  const normalizedElevation = (point.elevation - minElevation) / elevationRange;

  const y = height - padding - normalizedElevation * (height - padding * 2);

  return {
    x,
    y,
  };
}

export function getElevationSvgPoints(
  points: IElevationPoint[],
  minElevation: number,
  maxElevation: number,
  width: number,
  height: number,
  padding: number,
): IElevationProfilePoint[] {
  if (points.length === 0) {
    return [];
  }

  const totalDistanceMeters = points[points.length - 1]?.distanceMeters ?? 0;

  return points.map((point) =>
    getElevationSvgPoint(
      point,
      totalDistanceMeters,
      minElevation,
      maxElevation,
      width,
      height,
      padding,
    ),
  );
}

export function buildElevationLinePath(points: IElevationProfilePoint[]): string {
  if (points.length < 2) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function buildElevationAreaPath(
  points: IElevationProfilePoint[],
  height: number,
  padding: number,
): string {
  if (points.length < 2) {
    return '';
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    return '';
  }

  return [
    `M ${firstPoint.x} ${height - padding}`,
    `L ${firstPoint.x} ${firstPoint.y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${lastPoint.x} ${height - padding}`,
    'Z',
  ].join(' ');
}

export function getElevationProgressPoint(
  track: ITrackPoint[],
  elevationPoints: IElevationPoint[],
  currentTimeSeconds: number,
): IElevationPoint | null {
  if (track.length === 0 || elevationPoints.length === 0) {
    return null;
  }

  const firstPoint = track[0];

  if (!firstPoint) {
    return null;
  }

  const targetTime = firstPoint.timestamp.getTime() + currentTimeSeconds * 1000;

  if (targetTime <= firstPoint.timestamp.getTime()) {
    return elevationPoints[0] ?? null;
  }

  const lastIndex = track.length - 1;
  const lastPoint = track[lastIndex];
  const lastElevationPoint = elevationPoints[lastIndex];

  if (!lastPoint || !lastElevationPoint) {
    return null;
  }

  if (targetTime >= lastPoint.timestamp.getTime()) {
    return lastElevationPoint;
  }

  let left = 0;
  let right = lastIndex;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const point = track[middle];

    if (!point) {
      break;
    }

    const pointTime = point.timestamp.getTime();

    if (pointTime < targetTime) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  const nextIndex = left;
  const currentIndex = nextIndex - 1;

  const current = track[currentIndex];
  const next = track[nextIndex];

  const currentElevation = elevationPoints[currentIndex];
  const nextElevation = elevationPoints[nextIndex];

  if (!current || !next || !currentElevation || !nextElevation) {
    return null;
  }

  const currentTime = current.timestamp.getTime();
  const nextTime = next.timestamp.getTime();

  const duration = nextTime - currentTime;

  const progress = duration > 0 ? (targetTime - currentTime) / duration : 0;

  return {
    distanceMeters:
      currentElevation.distanceMeters +
      (nextElevation.distanceMeters - currentElevation.distanceMeters) * progress,

    elevation:
      currentElevation.elevation +
      (nextElevation.elevation - currentElevation.elevation) * progress,
  };
}

export function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const latitudeDelta = toRadians(latitude2 - latitude1);

  const longitudeDelta = toRadians(longitude2 - longitude1);

  const latitude1Radians = toRadians(latitude1);
  const latitude2Radians = toRadians(latitude2);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1Radians) * Math.cos(latitude2Radians) * Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
