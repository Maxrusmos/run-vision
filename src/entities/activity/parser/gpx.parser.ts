import { parseGPX } from '@we-gold/gpxjs';
import type { IActivity, ITrackPoint } from '../model/activity.types';

const NOT_GPX_MESSAGE = 'Это не GPX файл. Выберите файл тренировки с расширением .gpx';
const BROKEN_GPX_MESSAGE =
  'GPX файл повреждён или обрезан. Выгрузите тренировку из приложения ещё раз.';

/** Сколько уровней вложенности расширений просматривать (TrackPointExtension → hr). */
const EXTENSION_SEARCH_DEPTH = 3;

/**
 * Число из расширений точки по локальному имени тега — без учёта префикса
 * пространства имён: `ns3:hr` (Garmin Connect), `gpxtpx:hr` (Strava, Wahoo, Coros),
 * `hr` и т.п. Префикс в файле может быть любым, поэтому сравнивается только имя.
 */
export function findExtensionNumber(
  value: unknown,
  names: readonly string[],
  depth = EXTENSION_SEARCH_DEPTH,
): number | undefined {
  if (!value || typeof value !== 'object' || depth < 0) return undefined;

  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, item] of entries) {
    const localName = key.slice(key.lastIndexOf(':') + 1).toLowerCase();
    if (!names.includes(localName)) continue;
    const number = typeof item === 'number' ? item : Number(item);
    if (Number.isFinite(number)) return number;
  }
  for (const [, item] of entries) {
    const found = findExtensionNumber(item, names, depth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

const HEART_RATE_NAMES = ['hr', 'heartrate'];
/** Garmin пишет каденс одной ноги (`cad`) — шаги в минуту вдвое больше. */
const LEG_CADENCE_NAMES = ['cad'];
const CADENCE_NAMES = ['cadence'];

function getPositive(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 ? value : undefined;
}

function getCadence(extensions: unknown): number | undefined {
  const legCadence = getPositive(findExtensionNumber(extensions, LEG_CADENCE_NAMES));
  if (legCadence !== undefined) return legCadence * 2;
  return getPositive(findExtensionNumber(extensions, CADENCE_NAMES));
}

/**
 * Битый или обрезанный XML DOMParser не отвергает, а возвращает частичный документ
 * с `<parsererror>` — gpxjs тогда молча отдаёт половину трека. Проверяем сами.
 */
function validateGpxXml(xml: string, fileName: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const isGpxName = fileName.toLowerCase().endsWith('.gpx');

  if (document.getElementsByTagName('parsererror').length) {
    throw new Error(isGpxName ? BROKEN_GPX_MESSAGE : NOT_GPX_MESSAGE);
  }
  if (document.documentElement?.localName !== 'gpx') {
    throw new Error(NOT_GPX_MESSAGE);
  }
}

function createId(): string {
  // randomUUID есть только в защищённом контексте (https, localhost).
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export async function parseGpx(file: File): Promise<IActivity> {
  const xml = await file.text();
  validateGpxXml(xml, file.name);

  const [parsedFile, error] = parseGPX(xml);

  if (error || !parsedFile) {
    throw new Error(`Не удалось прочитать GPX файл: ${error?.message ?? 'неизвестная ошибка'}`);
  }

  // Тренировка может быть разбита на несколько <trk> — склеиваем их по порядку.
  const tracks = parsedFile.tracks.filter((track) => track.points.length);
  if (!parsedFile.tracks.length) {
    throw new Error('GPX файл не содержит треков');
  }
  if (!tracks.length) {
    throw new Error('GPX трек не содержит точек');
  }

  const rawPoints = tracks.flatMap((track) => track.points);
  const hasTimestamps = rawPoints.some((point) => point.time);
  const hasElevation = rawPoints.some((point) => Number.isFinite(point.elevation ?? NaN));

  // Точке без времени даём время предыдущей: так редкие пропуски не ломают расчёты.
  // Без времени вовсе — время эпохи у всех точек (не «сейчас»: иначе дата импорта
  // попала бы на карточку, а миллисекундные разницы — в темп и зоны).
  let lastTime = rawPoints.find((point) => point.time)?.time ?? new Date(0);

  const points: ITrackPoint[] = rawPoints.map((point) => {
    if (point.time) lastTime = point.time;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      elevation: point.elevation ?? NaN,
      timestamp: hasTimestamps ? lastTime : new Date(0),
      heartRate: getPositive(findExtensionNumber(point.extensions, HEART_RATE_NAMES)),
      cadence: getCadence(point.extensions),
    };
  });

  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  const durationSeconds = tracks.reduce((sum, track) => sum + track.duration.movingDuration, 0);
  const distanceMeters = tracks.reduce((sum, track) => sum + track.distance.total, 0);

  const averagePaceSecondsPerKm =
    distanceMeters > 0 && durationSeconds > 0 ? durationSeconds / (distanceMeters / 1000) : 0;

  return {
    id: createId(),
    name: tracks[0]!.name ?? parsedFile.metadata.name ?? 'Пробежка',
    startedAt: firstPoint.timestamp,
    finishedAt: lastPoint.timestamp,
    durationSeconds,
    distanceMeters,
    averagePaceSecondsPerKm,
    track: points,
    hasTimestamps,
    hasElevation,
  };
}
