import { LngLatBounds } from 'maplibre-gl';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';

export type IMapCoordinate = [number, number];

export function trackToCoordinates(track: ITrackPoint[]): IMapCoordinate[] {
  return track.map((point) => [point.longitude, point.latitude]);
}

export function getTrackBounds(coordinates: IMapCoordinate[]): LngLatBounds {
  const firstCoordinate = coordinates[0];

  if (!firstCoordinate) {
    throw new Error('Невозможно построить bounds для пустого трека');
  }

  return coordinates.reduce(
    (bounds, coordinate) => bounds.extend(coordinate),
    new LngLatBounds(firstCoordinate, firstCoordinate),
  );
}

export function getElapsedTrackCoordinates(
  track: ITrackPoint[],
  currentTimeSeconds: number,
): IMapCoordinate[] {
  const firstPoint = track[0];

  if (!firstPoint) {
    return [];
  }

  const targetTime = firstPoint.timestamp.getTime() + currentTimeSeconds * 1000;

  const coordinates: IMapCoordinate[] = [];

  for (let index = 0; index < track.length; index += 1) {
    const point = track[index];

    if (!point) {
      continue;
    }

    const pointTime = point.timestamp.getTime();

    if (pointTime <= targetTime) {
      coordinates.push([point.longitude, point.latitude]);

      continue;
    }

    const previousPoint = track[index - 1];

    if (!previousPoint) {
      break;
    }

    const previousTime = previousPoint.timestamp.getTime();
    const duration = pointTime - previousTime;

    const progress = duration > 0 ? (targetTime - previousTime) / duration : 0;

    const latitude = previousPoint.latitude + (point.latitude - previousPoint.latitude) * progress;

    const longitude =
      previousPoint.longitude + (point.longitude - previousPoint.longitude) * progress;

    coordinates.push([longitude, latitude]);

    break;
  }

  return coordinates;
}
