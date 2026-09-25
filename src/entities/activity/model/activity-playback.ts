import type { ITrackPoint } from './activity.types';

export type IPlaybackState = {
  currentTimeSeconds: number;
  durationSeconds: number;
  progress: number;
};

export function getPlaybackDuration(track: ITrackPoint[]): number {
  const firstPoint = track[0];
  const lastPoint = track[track.length - 1];

  if (!firstPoint || !lastPoint) {
    return 0;
  }

  return Math.max(0, (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000);
}

export function getPlaybackPosition(track: ITrackPoint[], currentTimeSeconds: number) {
  const firstPoint = track[0];
  const lastPoint = track[track.length - 1];

  if (!firstPoint || !lastPoint) {
    return null;
  }

  const targetTime = firstPoint.timestamp.getTime() + currentTimeSeconds * 1000;

  if (targetTime <= firstPoint.timestamp.getTime()) {
    return {
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude,
    };
  }

  if (targetTime >= lastPoint.timestamp.getTime()) {
    return {
      latitude: lastPoint.latitude,
      longitude: lastPoint.longitude,
    };
  }

  for (let index = 0; index < track.length - 1; index += 1) {
    const current = track[index];
    const next = track[index + 1];

    if (!current || !next) {
      continue;
    }

    const currentTime = current.timestamp.getTime();
    const nextTime = next.timestamp.getTime();

    if (targetTime < currentTime || targetTime > nextTime) {
      continue;
    }

    const duration = nextTime - currentTime;
    const progress = duration > 0 ? (targetTime - currentTime) / duration : 0;

    return {
      latitude: current.latitude + (next.latitude - current.latitude) * progress,
      longitude: current.longitude + (next.longitude - current.longitude) * progress,
    };
  }

  return {
    latitude: lastPoint.latitude,
    longitude: lastPoint.longitude,
  };
}
