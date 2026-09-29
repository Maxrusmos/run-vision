import { parseGPX } from '@we-gold/gpxjs';
import type { IActivity, ITrackPoint } from '../model/activity.types';

function getExtensionNumber(value: unknown, keys: string[]): number | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const extension = value as Record<string, unknown>;

  for (const key of keys) {
    const result = extension[key];

    if (typeof result === 'number') {
      return result;
    }

    if (typeof result === 'string') {
      const number = Number(result);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return undefined;
}

function getTrackPointExtension(extensions: unknown): unknown {
  if (!extensions || typeof extensions !== 'object') {
    return undefined;
  }

  const value = extensions as Record<string, unknown>;

  return value.TrackPointExtension ?? value['ns3:TrackPointExtension'];
}

function getCadence(value: number | undefined): number | undefined {
  if (value === undefined || value <= 0) {
    return undefined;
  }
  return value * 2;
}

export async function parseGpx(file: File): Promise<IActivity> {
  const xml = await file.text();

  const [parsedFile, error] = parseGPX(xml);

  if (error || !parsedFile) {
    throw new Error(`Ошибка парсинга GPX: ${error?.message ?? 'Неизвестная ошибка'}`);
  }

  const track = parsedFile.tracks[0];

  if (!track) {
    throw new Error('GPX файл не содержит треков');
  }

  if (!track.points.length) {
    throw new Error('GPX трек не содержит точек');
  }

  const points: ITrackPoint[] = track.points.map((point) => {
    const trackPointExtension = getTrackPointExtension(point.extensions);

    const cadence = getExtensionNumber(trackPointExtension, ['cad', 'ns3:cad']);

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      elevation: point.elevation ?? 0,
      timestamp: point.time ?? new Date(),
      heartRate: getExtensionNumber(trackPointExtension, ['hr', 'ns3:hr']),
      cadence: getCadence(cadence),
    };
  });

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    throw new Error('GPX трек не содержит достаточно точек');
  }

  const durationSeconds = track.duration.movingDuration;
  const distanceMeters = track.distance.total;

  const averagePaceSecondsPerKm =
    distanceMeters > 0 ? durationSeconds / (distanceMeters / 1000) : 0;

  return {
    id: crypto.randomUUID(),
    name: track.name ?? parsedFile.metadata.name ?? 'Пробежка',
    startedAt: firstPoint.timestamp,
    finishedAt: lastPoint.timestamp,
    durationSeconds,
    distanceMeters,
    averagePaceSecondsPerKm,
    track: points,
  };
}
