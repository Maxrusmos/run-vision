import type { ITrackPoint } from './activity.types';

export function getPlaybackDuration(track: ITrackPoint[]): number {
  const firstPoint = track[0];
  const lastPoint = track[track.length - 1];
  if (!firstPoint || !lastPoint) {
    return 0;
  }
  return Math.max(0, (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000);
}
