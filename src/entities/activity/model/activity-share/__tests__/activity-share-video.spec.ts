import { describe, expect, it } from 'vitest';
import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import { getActivityShareStats } from '../activity-share-stats';
import {
  VIDEO_FINISH_HOLD_SECONDS,
  buildTrackTimeline,
  getActivityAtProgress,
  getRouteProgressAt,
  getStatProgress,
  getTrackLocation,
} from '../activity-share-video';

/** Прямая на восток: 101 точка через ~55 м, по 20 с, с остановкой на 10 минут посередине. */
function straightTrack(): ITrackPoint[] {
  let time = 0;
  return Array.from({ length: 101 }, (_, index) => {
    if (index === 51) time += 600_000;
    else if (index > 0) time += 20_000;
    return {
      latitude: 0,
      longitude: index * 0.0005,
      elevation: 100,
      timestamp: new Date(time),
    };
  });
}

function activity(track: ITrackPoint[]): IActivity {
  return {
    id: 'test',
    name: 'Бег',
    startedAt: track[0]!.timestamp,
    finishedAt: track[track.length - 1]!.timestamp,
    durationSeconds: 2000,
    distanceMeters: 5600,
    averagePaceSecondsPerKm: 2000 / 5.6,
    track,
    hasTimestamps: true,
    hasElevation: true,
  };
}

describe('getTrackLocation', () => {
  it('находит отрезок по доле дистанции', () => {
    const timeline = buildTrackTimeline(straightTrack());
    expect(getTrackLocation(timeline, 0)).toEqual({ index: 0, t: 0 });
    const middle = getTrackLocation(timeline, 0.255);
    expect(middle.index).toBe(25);
    expect(middle.t).toBeCloseTo(0.5, 2);
    const end = getTrackLocation(timeline, 1);
    expect(end.index + end.t).toBeCloseTo(100, 6);
  });

  it('пропускает точки без координат, как projectRoute', () => {
    const track = straightTrack();
    track.splice(10, 0, { ...track[10]!, latitude: NaN });
    const timeline = buildTrackTimeline(track);
    expect(timeline.sourceIndex.length).toBe(101);
    expect(timeline.sourceIndex[10]).toBe(11);
  });

  it('трек из одной точки — без ошибок', () => {
    const timeline = buildTrackTimeline(straightTrack().slice(0, 1));
    expect(getTrackLocation(timeline, 0.5)).toEqual({ index: 0, t: 0 });
  });
});

describe('getActivityAtProgress', () => {
  it('на финише — исходная тренировка (те же цифры, что на фото)', () => {
    const source = activity(straightTrack());
    const timeline = buildTrackTimeline(source.track);
    expect(getActivityAtProgress(source, timeline, 1)).toBe(source);
  });

  it('дистанция и время растут с прогрессом и приводятся к GPX', () => {
    const source = activity(straightTrack());
    const timeline = buildTrackTimeline(source.track);
    const half = getActivityAtProgress(source, timeline, 0.5);
    expect(half.distanceMeters).toBeCloseTo(2800, 0);
    // Остановка (отрезок 51) не считается временем в движении: из 99 отрезков в движении
    // к середине пройдено 50 — значит, 50/99 времени из GPX.
    expect(half.durationSeconds).toBeCloseTo((50 / 99) * 2000, 1);
    const later = getActivityAtProgress(source, timeline, 0.75);
    expect(later.distanceMeters).toBeGreaterThan(half.distanceMeters);
    expect(later.durationSeconds).toBeGreaterThan(half.durationSeconds);
  });

  it('показатели считаются по части трека', () => {
    const source = activity(straightTrack());
    const timeline = buildTrackTimeline(source.track);
    const stats = getActivityShareStats(getActivityAtProgress(source, timeline, 0.5));
    expect(stats.distance).toBe('2.80 км');
  });
});

describe('время видео', () => {
  it('точка доходит до финиша и стоит в конце', () => {
    expect(getRouteProgressAt(0, 10)).toBe(0);
    expect(getRouteProgressAt(10 - VIDEO_FINISH_HOLD_SECONDS, 10)).toBe(1);
    expect(getRouteProgressAt(10, 10)).toBe(1);
  });

  it('показатели меняются ступеньками и не бывают пустыми на старте', () => {
    // 10 с видео, 9 с движения → 18 ступенек.
    expect(getStatProgress(0, 10)).toBeCloseTo(1 / 18);
    expect(getStatProgress(0.01, 10)).toBeCloseTo(1 / 18);
    expect(getStatProgress(0.06, 10)).toBeCloseTo(2 / 18);
    expect(getStatProgress(1, 10)).toBe(1);
  });
});
