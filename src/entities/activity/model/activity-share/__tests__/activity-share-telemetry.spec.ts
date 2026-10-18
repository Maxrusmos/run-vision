import { describe, expect, it } from 'vitest';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import {
  getHeartRateSeries,
  getHeartRateZones,
  getPaceSeries,
  getSplits,
  getTapeSeries,
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

describe('зоны «до точки» (видео)', () => {
  // Пульс растёт от 120 до ~180: в начале — нижние зоны, к концу — Z5.
  const rising = () =>
    track(
      100,
      () => 30,
      (index) => 120 + index * 0.6,
    );

  it('считают время только до доли дистанции, а границы — по всей тренировке', () => {
    const full = getHeartRateZones(rising())!;
    const early = getHeartRateZones(rising(), 0.3)!;
    expect(early.map((zone) => zone.from)).toEqual(full.map((zone) => zone.from));
    expect(early.reduce((sum, zone) => sum + zone.share, 0)).toBeCloseTo(1);
    // В начале пульс ещё не дошёл до Z5.
    expect(early[4]!.share).toBe(0);
    expect(full[4]!.share).toBeGreaterThan(0);
  });

  it('до первых секунд в зонах — нулевые доли, а не «нет данных»', () => {
    const zones = getHeartRateZones(rising(), 0);
    expect(zones).not.toBeNull();
    expect(zones!.every((zone) => zone.share === 0)).toBe(true);
  });

  it('progress = 1 — как без него', () => {
    expect(getHeartRateZones(rising(), 1)).toEqual(getHeartRateZones(rising()));
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

describe('getTapeSeries', () => {
  // Плавный подъём 0,2…0,8 и мелкая «пила» поверх.
  const values = Array.from(
    { length: 400 },
    (_, index) => 0.2 + 0.6 * (index / 399) + (index % 2 ? 0.1 : -0.1),
  );

  it('убирает «пилу» и растягивает ряд на 0…1', () => {
    const tape = getTapeSeries(values, 140);
    expect(Math.min(...tape.values)).toBeCloseTo(0);
    expect(Math.max(...tape.values)).toBeCloseTo(1);
    const jumps = tape.values.slice(1).map((value, index) => Math.abs(value - tape.values[index]!));
    expect(Math.max(...jumps)).toBeLessThan(0.02);
  });

  it('края шкалы — в долях исходного ряда', () => {
    const tape = getTapeSeries(values, 140);
    expect(tape.from).toBeGreaterThan(0.15);
    expect(tape.to).toBeLessThan(0.85);
    expect(tape.from).toBeLessThan(tape.to);
  });

  it('ровный ряд — посередине, пустой и без длины — как есть', () => {
    expect(new Set(getTapeSeries([0.3, 0.3, 0.3], 100).values)).toEqual(new Set([0.5]));
    expect(getTapeSeries([], 100).values).toEqual([]);
    expect(getTapeSeries([0.1, 0.9], 0).values).toEqual([0.1, 0.9]);
  });
});
