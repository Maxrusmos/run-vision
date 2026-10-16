import { describe, expect, it } from 'vitest';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import { getKmMarkerStep, getKmMarkers, isLoopRoute } from '../activity-share-map';

/** Прямой трек на восток по экватору: 0,001° долготы ≈ 111 м. */
function straightTrack(km: number): ITrackPoint[] {
  const points = Math.round((km * 1000) / 111) + 1;
  return Array.from({ length: points }, (_, index) => ({
    latitude: 0,
    longitude: index * 0.001,
    elevation: 0,
    timestamp: new Date(index * 1000),
  }));
}

describe('getKmMarkerStep', () => {
  it('подбирает шаг так, чтобы флажков было не больше шести', () => {
    expect(getKmMarkerStep(5)).toBe(1);
    expect(getKmMarkerStep(10)).toBe(2);
    expect(getKmMarkerStep(21.1)).toBe(5);
    expect(getKmMarkerStep(42.2)).toBe(10);
  });
});

describe('getKmMarkers', () => {
  it('ставит отметки на каждом шаге, кроме самого финиша', () => {
    const markers = getKmMarkers(straightTrack(5.1));
    expect(markers.map((marker) => marker.km)).toEqual([1, 2, 3, 4]);
    // 1 км ≈ 0,009° долготы на экваторе.
    expect(markers[0]!.lngLat[0]).toBeCloseTo(0.009, 3);
  });

  it('короткий трек — без отметок', () => {
    expect(getKmMarkers(straightTrack(0.8))).toEqual([]);
  });
});

describe('isLoopRoute', () => {
  it('отличает круг от маршрута «из точки в точку»', () => {
    expect(
      isLoopRoute([
        [0, 0],
        [0.01, 0],
        [0.0005, 0],
      ]),
    ).toBe(true);
    expect(
      isLoopRoute([
        [0, 0],
        [0.01, 0],
      ]),
    ).toBe(false);
  });
});
