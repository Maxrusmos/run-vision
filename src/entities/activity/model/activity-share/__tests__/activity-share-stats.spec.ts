import { describe, expect, it } from 'vitest';
import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import { getActivityShareStats } from '../activity-share-stats';
import { getElevationProfile } from '../activity-share-elevation';
import { getDefaultVisibleStats } from '../activity-share-stat-options';

/** Ровный подъём на 50 м с шумом GPS ±6 м — у «сырых» точек набор в разы больше. */
function noisyTrack(withTime = true): ITrackPoint[] {
  return Array.from({ length: 400 }, (_, index) => ({
    latitude: 0,
    longitude: index * 0.0005,
    elevation: 100 + index / 8 + (index % 2 ? 6 : -6),
    timestamp: new Date(withTime ? index * 20_000 : 0),
  }));
}

function activity(track: ITrackPoint[], patch: Partial<IActivity> = {}): IActivity {
  return {
    id: 'test',
    name: 'Бег',
    startedAt: track[0]!.timestamp,
    finishedAt: track[track.length - 1]!.timestamp,
    durationSeconds: 7980,
    distanceMeters: 22_000,
    averagePaceSecondsPerKm: 362,
    track,
    hasTimestamps: true,
    hasElevation: true,
    ...patch,
  };
}

describe('getActivityShareStats', () => {
  it('набор высоты совпадает с подписью графика высоты', () => {
    const track = noisyTrack();
    const stats = getActivityShareStats(activity(track));
    const profile = getElevationProfile(track, 2);
    expect(stats.elevationGain).toBe(`${Math.round(profile.gain)} м`);
    expect(stats.maxElevation).toBe(`${Math.round(profile.max)} м`);
  });

  it('без времени в GPX — прочерки вместо сегодняшней даты и «0:00»', () => {
    const track = noisyTrack(false);
    const stats = getActivityShareStats(
      activity(track, { hasTimestamps: false, durationSeconds: 0, averagePaceSecondsPerKm: 0 }),
    );
    expect(stats.date).toBe('—');
    expect(stats.startTime).toBe('—');
    expect(stats.elapsedTime).toBe('—');
    expect(stats.bestKm).toBe('—');
    expect(stats.averagePace).toBe('—');
  });

  it('без высоты в GPX — прочерки вместо «0 м»', () => {
    const track = noisyTrack().map((point) => ({ ...point, elevation: NaN }));
    const stats = getActivityShareStats(activity(track, { hasElevation: false }));
    expect(stats.elevationGain).toBe('—');
    expect(stats.maxElevation).toBe('—');
  });
});

describe('getDefaultVisibleStats', () => {
  it('без пульса показатель пульса заменяется показателем с данными', () => {
    const stats = getDefaultVisibleStats((key) => key !== 'averageHeartRate');
    expect(stats).not.toContain('averageHeartRate');
    expect(stats).toHaveLength(4);
  });
});
