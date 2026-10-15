import type { ITrackPoint } from './activity.types';
import { getDistanceMeters } from './elevation/elevation-calculations';

type TrackSample = {
  distanceMeters: number;
  timeSeconds: number;
};

function buildTrackSamples(track: ITrackPoint[]): TrackSample[] {
  const first = track[0];
  if (!first) return [];

  const startTime = first.timestamp.getTime();
  const samples: TrackSample[] = [];
  let distanceMeters = 0;

  track.forEach((point, index) => {
    const previous = track[index - 1];

    if (previous) {
      distanceMeters += getDistanceMeters(
        previous.latitude,
        previous.longitude,
        point.latitude,
        point.longitude,
      );
    }

    samples.push({ distanceMeters, timeSeconds: (point.timestamp.getTime() - startTime) / 1000 });
  });

  return samples;
}

/**
 * Самый быстрый отрезок трека длиной `targetMeters` (в секундах).
 * Окно двумя указателями; начало окна интерполируется внутри сегмента.
 * Возвращает null, если трек короче отрезка или в нём нет времени.
 */
export function getBestEffortSeconds(track: ITrackPoint[], targetMeters: number): number | null {
  const samples = buildTrackSamples(track);
  const last = samples[samples.length - 1];

  if (!last || last.distanceMeters < targetMeters || last.timeSeconds <= 0) {
    return null;
  }

  let best = Infinity;
  let startIndex = 0;

  for (let endIndex = 1; endIndex < samples.length; endIndex += 1) {
    const end = samples[endIndex]!;

    // Сдвигаем начало, пока следующий сегмент целиком помещается в окно.
    while (end.distanceMeters - samples[startIndex + 1]!.distanceMeters >= targetMeters) {
      startIndex += 1;
    }

    const start = samples[startIndex]!;
    const windowMeters = end.distanceMeters - start.distanceMeters;
    if (windowMeters < targetMeters) continue;

    const next = samples[startIndex + 1]!;
    const segmentMeters = next.distanceMeters - start.distanceMeters;
    const excessShare = segmentMeters > 0 ? (windowMeters - targetMeters) / segmentMeters : 0;
    const windowStartTime =
      start.timeSeconds + (next.timeSeconds - start.timeSeconds) * excessShare;
    const seconds = end.timeSeconds - windowStartTime;

    if (seconds > 0) {
      best = Math.min(best, seconds);
    }
  }

  return Number.isFinite(best) ? best : null;
}
