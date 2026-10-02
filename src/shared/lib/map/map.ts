import type { ITrackPoint } from '@/entities/activity/model/activity.types';

export type IMapCoordinate = [number, number];

export function trackToCoordinates(track: ITrackPoint[]): IMapCoordinate[] {
  return track.map((point) => [point.longitude, point.latitude]);
}
