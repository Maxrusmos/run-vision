import { describe, expect, it } from 'vitest';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import {
  getHeartRateSeries,
  getHeartRateZones,
  getPaceSeries,
  getSplits,
  normalizeSeries,
  resampleSeries,
} from '../activity-share-telemetry';

/** Трек на восток по экватору: точка каждые ~111 м, `secondsPerPoint` — темп. */
function track(
  points: number,
  secondsPerPoint: (index: number) => number,
  hr?: (i: number) => number,
): ITrackPoint[] {
  let time = 0;
  return Array.from({ length: points }, (_, index) => {
    if (index) time += secondsPerPoint(index);
    return {
      latitude: 0,
      longitude: index * 0.001,
      elevation: 0,
      timestamp: new Date(time * 1000),
      heartRate: hr?.(index),
    };
  });
}

describe('getSplits', () => {
  it('считает темп каждого километра и неполный последний', () => {
    // ~111 м за 37 с → ~5:33 /км; 25 точек ≈ 2,7 км.
    const splits = getSplits(track(25, () => 37));
    expect(splits.map((split) => split.km)).toEqual([1, 2, 3]);
    expect(splits[0]!.pace).toBeGreaterThan(320);
    expect(splits[0]!.pace).toBeLessThan(345);
    expect(splits[2]!.length).toBeLessThan(1);
  });
});

describe('getPaceSeries', () => {
  it('быстрая вторая половина видна в ряду', () => {
    const series = getPaceSeries(track(60, (index) => (index < 30 ? 40 : 30)))!;
    expect(series.values[50]!).toBeGreaterThan(series.values[350]!);
    expect(series.best).toBeLessThan(series.average);
  });
});

describe('пульс', () => {
  it('без пульса в GPX — null', () => {
    expect(getHeartRateSeries(track(10, () => 30))).toBeNull();
    expect(getHeartRateZones(track(10, () => 30))).toBeNull();
  });

  it('время в зонах в сумме — 100%', () => {
    const zones = getHeartRateZones(
      track(
        100,
        () => 30,
        (index) => 120 + index * 0.6,
      ),
    )!;
    expect(zones).toHaveLength(5);
    expect(zones.reduce((sum, zone) => sum + zone.share, 0)).toBeCloseTo(1);
    expect(zones[4]!.share).toBeGreaterThan(0);
  });
});

describe('ряды', () => {
  it('resampleSeries усредняет и растягивает', () => {
    expect(resampleSeries([1, 3, 5, 7], 2)).toEqual([2, 6]);
    expect(resampleSeries([0, 10], 3)).toEqual([0, 5, 10]);
  });

  it('normalizeSeries с инверсией: меньше — выше', () => {
    expect(normalizeSeries([300, 360], true)).toEqual([1, 0]);
    expect(normalizeSeries([5, 5])).toEqual([0.5, 0.5]);
  });
});

describe('длинные треки', () => {
  it('пульс и зоны на 200 тыс. точек не падают (нет Math.max(...массив))', () => {
    const long = track(
      200_000,
      () => 1,
      (index) => 120 + (index % 50),
    );
    expect(() => getHeartRateSeries(long)).not.toThrow();
    expect(getHeartRateZones(long)).not.toBeNull();
  });
});

describe('без времени', () => {
  it('сплитов и темпа нет', () => {
    const noTime = track(30, () => 0);
    expect(getSplits(noTime)).toEqual([]);
    expect(getPaceSeries(noTime)).toBeNull();
    expect(
      getHeartRateZones(
        track(
          30,
          () => 0,
          () => 150,
        ),
      ),
    ).toBeNull();
  });
});
