import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import type { ShareStatKey } from '@/entities/activity/model/activity-share/activity-share.types.ts';
import {
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatPace,
  formatPlaybackDistance,
} from '@/shared/lib/formatters/formatters.ts';

export type ActivityShareStat = {
  label: string;
  value: string;
};

export function getActivityShareStat(activity: IActivity, key: ShareStatKey): ActivityShareStat {
  const track = activity.track;

  const labels: Record<ShareStatKey, string> = {
    distance: 'Дистанция',
    duration: 'Время',
    averagePace: 'Средний темп',
    averageHeartRate: 'Средний пульс',
    maxHeartRate: 'Макс. пульс',
    averageCadence: 'Частота шагов',
    elevationGain: 'Набор высоты',
  };

  let value = '—';

  switch (key) {
    case 'distance':
      value = `${formatPlaybackDistance(activity.distanceMeters)} км`;
      break;

    case 'duration':
      value = `${formatDuration(activity.durationSeconds)} мин`;
      break;

    case 'averagePace':
      value = `${formatPace(activity.averagePaceSecondsPerKm)} /км`;
      break;

    case 'averageHeartRate': {
      const values = track
        .map((point) => point.heartRate)
        .filter(
          (value): value is number => value !== undefined && Number.isFinite(value) && value > 0,
        );

      if (!values.length) {
        value = '—';
        break;
      }

      const sum = values.reduce((total, item) => total + item, 0);
      value = `${formatHeartRate(sum / values.length)} уд/мин`;
      break;
    }

    case 'maxHeartRate': {
      const values = track
        .map((point) => point.heartRate)
        .filter(
          (value): value is number => value !== undefined && Number.isFinite(value) && value > 0,
        );

      value = values.length ? `${formatHeartRate(Math.max(...values))} уд/мин` : '—';
      break;
    }

    case 'averageCadence': {
      const values = track
        .map((point) => point.cadence)
        .filter(
          (value): value is number => value !== undefined && Number.isFinite(value) && value > 0,
        );

      if (!values.length) {
        value = '—';
        break;
      }

      const sum = values.reduce((total, item) => total + item, 0);
      value = `${Math.round(sum / values.length)} шаг/мин`;
      break;
    }

    case 'elevationGain': {
      let gain = 0;

      for (let i = 1; i < track.length; i++) {
        const previous = track[i - 1];
        const current = track[i];

        if (!previous || !current) continue;

        if (Number.isFinite(previous.elevation) && Number.isFinite(current.elevation)) {
          gain += Math.max(0, current.elevation - previous.elevation);
        }
      }

      value = formatElevation(gain);
      break;
    }
  }

  return {
    label: labels[key],
    value,
  };
}
