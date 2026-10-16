import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import { getBestEffortSeconds } from '@/entities/activity/model/activity-best-effort';
import {
  buildElevationPoints,
  getElevationStats,
  smoothElevationPoints,
} from '@/entities/activity/model/elevation/elevation-calculations';
import {
  formatClockDuration,
  formatElevation,
  formatHeartRate,
  formatPace,
  formatPlaybackDistance,
  formatShortDate,
  formatTimeOfDay,
} from '@/shared/lib/formatters/formatters';
import type { ShareStatKey } from './activity-share.types';

export const SHARE_STAT_EMPTY_VALUE = '—';
const EMPTY_VALUE = SHARE_STAT_EMPTY_VALUE;

function getPositiveValues(
  track: ITrackPoint[],
  select: (point: ITrackPoint) => number | undefined,
): number[] {
  const values: number[] = [];

  for (const point of track) {
    const value = select(point);

    if (value !== undefined && Number.isFinite(value) && value > 0) {
      values.push(value);
    }
  }

  return values;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function max(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((result, value) => Math.max(result, value), -Infinity);
}

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function withUnit(value: string, unit: string): string {
  return value === EMPTY_VALUE ? value : `${value} ${unit}`;
}

function getElevationStatsForTrack(track: ITrackPoint[]) {
  if (track.length < 2) return null;

  // Сглаживаем высоту, чтобы шум GPS не завышал набор и сброс.
  return getElevationStats(smoothElevationPoints(buildElevationPoints(track)));
}

/**
 * Считает все показатели карточки за один проход по тренировке.
 */
export function getActivityShareStats(activity: IActivity): Record<ShareStatKey, string> {
  const { track, distanceMeters, durationSeconds, averagePaceSecondsPerKm } = activity;

  const heartRates = getPositiveValues(track, (point) => point.heartRate);
  const cadences = getPositiveValues(track, (point) => point.cadence);
  const averageCadence = average(cadences);
  const elevation = getElevationStatsForTrack(track);
  const elapsedSeconds = (activity.finishedAt.getTime() - activity.startedAt.getTime()) / 1000;
  const bestKmSeconds = getBestEffortSeconds(track, 1000);
  const best5kSeconds = getBestEffortSeconds(track, 5000);

  const hasDistance = Number.isFinite(distanceMeters) && distanceMeters > 0;
  const hasMovingTime = isPositive(durationSeconds);
  const speedKmh =
    hasDistance && hasMovingTime ? distanceMeters / 1000 / (durationSeconds / 3600) : null;
  // Длина шага: метры в минуту / шаги в минуту.
  const strideMeters =
    speedKmh !== null && isPositive(averageCadence)
      ? (speedKmh * 1000) / 60 / averageCadence
      : null;

  return {
    distance: hasDistance ? `${formatPlaybackDistance(distanceMeters)} км` : EMPTY_VALUE,
    duration: hasMovingTime ? formatClockDuration(durationSeconds) : EMPTY_VALUE,
    elapsedTime: isPositive(elapsedSeconds) ? formatClockDuration(elapsedSeconds) : EMPTY_VALUE,
    averagePace: isPositive(averagePaceSecondsPerKm)
      ? `${formatPace(averagePaceSecondsPerKm)} /км`
      : EMPTY_VALUE,
    averageSpeed: speedKmh === null ? EMPTY_VALUE : `${speedKmh.toFixed(1)} км/ч`,
    bestKm: bestKmSeconds === null ? EMPTY_VALUE : `${formatPace(bestKmSeconds)} /км`,
    best5k: best5kSeconds === null ? EMPTY_VALUE : formatClockDuration(best5kSeconds),
    averageHeartRate: withUnit(formatHeartRate(average(heartRates)), 'уд/мин'),
    maxHeartRate: withUnit(formatHeartRate(max(heartRates)), 'уд/мин'),
    averageCadence: isPositive(averageCadence)
      ? `${Math.round(averageCadence)} шаг/мин`
      : EMPTY_VALUE,
    strideLength: strideMeters === null ? EMPTY_VALUE : `${strideMeters.toFixed(2)} м`,
    elevationGain: formatElevation(elevation?.totalAscentMeters ?? null),
    elevationLoss: formatElevation(elevation?.totalDescentMeters ?? null),
    maxElevation: formatElevation(elevation?.maxElevation ?? null),
    startTime: formatTimeOfDay(activity.startedAt),
    date: formatShortDate(activity.startedAt),
  };
}
