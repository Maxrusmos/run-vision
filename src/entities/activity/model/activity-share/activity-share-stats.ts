import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import {
  buildElevationPoints,
  getElevationStats,
  smoothElevationPoints,
} from '@/entities/activity/model/elevation/elevation-calculations';
import {
  formatActivityDuration,
  formatElevation,
  formatHeartRate,
  formatPace,
  formatPlaybackDistance,
} from '@/shared/lib/formatters/formatters';
import type { ShareStatKey } from './activity-share.types';

const EMPTY_VALUE = '—';

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
  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function max(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  return values.reduce((result, value) => Math.max(result, value), -Infinity);
}

function withUnit(value: string, unit: string): string {
  return value === EMPTY_VALUE ? value : `${value} ${unit}`;
}

function getElevationGain(track: ITrackPoint[]): number | null {
  if (track.length < 2) {
    return null;
  }

  // Сглаживаем высоту, чтобы шум GPS не завышал набор.
  const points = smoothElevationPoints(buildElevationPoints(track));
  return getElevationStats(points).totalAscentMeters;
}

/**
 * Считает все показатели карточки за один проход по тренировке.
 */
export function getActivityShareStats(activity: IActivity): Record<ShareStatKey, string> {
  const { track } = activity;

  const heartRates = getPositiveValues(track, (point) => point.heartRate);
  const cadences = getPositiveValues(track, (point) => point.cadence);
  const averageCadence = average(cadences);
  const hasDistance = Number.isFinite(activity.distanceMeters) && activity.distanceMeters >= 0;
  const hasPace =
    Number.isFinite(activity.averagePaceSecondsPerKm) && activity.averagePaceSecondsPerKm > 0;

  return {
    distance: hasDistance ? `${formatPlaybackDistance(activity.distanceMeters)} км` : EMPTY_VALUE,
    duration: formatActivityDuration(activity.durationSeconds),
    averagePace: hasPace ? `${formatPace(activity.averagePaceSecondsPerKm)} /км` : EMPTY_VALUE,
    averageHeartRate: withUnit(formatHeartRate(average(heartRates)), 'уд/мин'),
    maxHeartRate: withUnit(formatHeartRate(max(heartRates)), 'уд/мин'),
    averageCadence: averageCadence === null ? EMPTY_VALUE : `${Math.round(averageCadence)} шаг/мин`,
    elevationGain: formatElevation(getElevationGain(track)),
  };
}
