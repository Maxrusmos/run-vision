import type { IElevationPoint, ITrackPoint } from '../activity.types';

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

    if (point.timestamp.getTime() < targetTime) {
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
