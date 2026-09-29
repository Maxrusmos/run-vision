import type { IActivity } from './activity.types';

export type PlaybackCoordinate = [number, number];

export function getPlaybackPosition(
  activity: IActivity,
  seconds: number,
  coordinates: PlaybackCoordinate[],
): {
  coordinate: PlaybackCoordinate;
  index: number;
} | null {
  const track = activity.track;
  const firstPoint = track[0];

  if (!firstPoint || coordinates.length === 0) {
    return null;
  }

  let currentIndex = 0;

  for (let index = 0; index < track.length; index += 1) {
    const point = track[index];

    if (!point) continue;

    const elapsed = (point.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000;

    if (elapsed <= seconds) {
      currentIndex = index;
    } else {
      break;
    }
  }

  const currentPoint = track[currentIndex];
  const currentCoordinate = coordinates[currentIndex];

  if (!currentPoint || !currentCoordinate) {
    return null;
  }

  const nextPoint = track[currentIndex + 1];
  const nextCoordinate = coordinates[currentIndex + 1];

  if (!nextPoint || !nextCoordinate) {
    return {
      coordinate: [currentCoordinate[0], currentCoordinate[1]],
      index: currentIndex,
    };
  }

  const currentElapsed = (currentPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000;

  const nextElapsed = (nextPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000;

  const interval = nextElapsed - currentElapsed;

  if (interval <= 0) {
    return {
      coordinate: [currentCoordinate[0], currentCoordinate[1]],
      index: currentIndex,
    };
  }

  const progress = Math.min(Math.max((seconds - currentElapsed) / interval, 0), 1);

  return {
    coordinate: [
      currentCoordinate[0] + (nextCoordinate[0] - currentCoordinate[0]) * progress,
      currentCoordinate[1] + (nextCoordinate[1] - currentCoordinate[1]) * progress,
    ],
    index: currentIndex,
  };
}
