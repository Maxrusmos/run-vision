import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import { getBestEffortSeconds } from '@/entities/activity/model/activity-best-effort';
import { getElevationProfile } from './activity-share-elevation';
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

/**
 * Набор, сброс и максимум высоты — из того же профиля, что у графика высоты
 * (сглаживание по дистанции, порог 3 м): иначе цифра на карточке и подпись графика
 * расходятся в разы — шум GPS даёт ложный «набор».
 */
function getElevationStatsForActivity(activity: IActivity) {
  if (!activity.hasElevation || activity.track.length < 2) return null;
  const profile = getElevationProfile(activity.track, 2);
  return { gain: profile.gain, loss: profile.loss, max: profile.max };
}

/**
 * Считает все показатели карточки за один проход по тренировке.
 */
export function getActivityShareStats(activity: IActivity): Record<ShareStatKey, string> {
  const { track, distanceMeters, durationSeconds, averagePaceSecondsPerKm } = activity;

  const heartRates = getPositiveValues(track, (point) => point.heartRate);
  const cadences = getPositiveValues(track, (point) => point.cadence);
  const averageCadence = average(cadences);
  const elevation = getElevationStatsForActivity(activity);
  const hasTime = activity.hasTimestamps;
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
    elapsedTime:
      hasTime && isPositive(elapsedSeconds) ? formatClockDuration(elapsedSeconds) : EMPTY_VALUE,
    averagePace: isPositive(averagePaceSecondsPerKm)
      ? `${formatPace(averagePaceSecondsPerKm)} /км`
      : EMPTY_VALUE,
    averageSpeed: speedKmh === null ? EMPTY_VALUE : `${speedKmh.toFixed(1)} км/ч`,
    bestKm: isPositive(bestKmSeconds) ? `${formatPace(bestKmSeconds)} /км` : EMPTY_VALUE,
    best5k: isPositive(best5kSeconds) ? formatClockDuration(best5kSeconds) : EMPTY_VALUE,
    averageHeartRate: withUnit(formatHeartRate(average(heartRates)), 'уд/мин'),
    maxHeartRate: withUnit(formatHeartRate(max(heartRates)), 'уд/мин'),
    averageCadence: isPositive(averageCadence)
      ? `${Math.round(averageCadence)} шаг/мин`
      : EMPTY_VALUE,
    strideLength: strideMeters === null ? EMPTY_VALUE : `${strideMeters.toFixed(2)} м`,
    elevationGain: formatElevation(elevation?.gain ?? null),
    elevationLoss: formatElevation(elevation?.loss ?? null),
    maxElevation: formatElevation(elevation?.max ?? null),
    // Без времени в GPX даты нет — не подставляем «сегодня».
    startTime: hasTime ? formatTimeOfDay(activity.startedAt) : EMPTY_VALUE,
    date: hasTime ? formatShortDate(activity.startedAt) : EMPTY_VALUE,
  };
}
