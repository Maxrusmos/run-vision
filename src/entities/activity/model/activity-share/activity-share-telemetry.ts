import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import { getDistanceMeters } from '@/entities/activity/model/elevation-profile';

/** Точек в подробном ряду (темп, пульс): шаг ~0,25% дистанции, как у профиля высоты. */
export const TELEMETRY_SAMPLES = 400;
/** Радиус сглаживания в точках подробного ряда. */
const SMOOTH_RADIUS = 5;

type TrackSample = { distance: number; time: number; heartRate: number | null };

/** Дистанция (м) и время (с) от старта для каждой точки трека. */
function measureTrack(track: ITrackPoint[]): TrackSample[] {
  const points = track.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const start = points[0]?.timestamp.getTime() ?? 0;
  let distance = 0;

  return points.map((point, index) => {
    const previous = points[index - 1];
    if (previous) {
      distance += getDistanceMeters(
        previous.latitude,
        previous.longitude,
        point.latitude,
        point.longitude,
      );
    }
    return {
      distance,
      time: (point.timestamp.getTime() - start) / 1000,
      heartRate: point.heartRate && point.heartRate > 0 ? point.heartRate : null,
    };
  });
}

/** Значение в точке дистанции — линейно между соседними точками. */
function sampleAt(
  samples: TrackSample[],
  count: number,
  value: (sample: TrackSample) => number | null,
): (number | null)[] {
  const total = samples[samples.length - 1]?.distance ?? 0;
  if (samples.length < 2 || total <= 0) return [];

  const result: (number | null)[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    const distance = (index / (count - 1)) * total;
    while (cursor < samples.length - 2 && samples[cursor + 1]!.distance < distance) cursor++;
    const a = samples[cursor]!;
    const b = samples[cursor + 1]!;
    const va = value(a);
    const vb = value(b);
    if (va === null || vb === null) {
      result.push(va ?? vb);
      continue;
    }
    const span = b.distance - a.distance;
    const t = span > 0 ? Math.min(1, Math.max(0, (distance - a.distance) / span)) : 0;
    result.push(va + (vb - va) * t);
  }
  return result;
}

/** Скользящее среднее (два прохода — почти гауссово сглаживание). */
export function smoothSeries(values: number[], radius = SMOOTH_RADIUS): number[] {
  const pass = (source: number[]) =>
    source.map((_, index) => {
      const from = Math.max(0, index - radius);
      const to = Math.min(source.length - 1, index + radius);
      let sum = 0;
      for (let i = from; i <= to; i++) sum += source[i]!;
      return sum / (to - from + 1);
    });
  return pass(pass(values));
}

/** Пересчёт ряда в `count` точек: среднее по корзинам (для столбцов) или интерполяция. */
export function resampleSeries(values: number[], count: number): number[] {
  if (!values.length || count <= 0) return [];
  if (count >= values.length) {
    return Array.from({ length: count }, (_, index) => {
      const position = (index / Math.max(1, count - 1)) * (values.length - 1);
      const left = Math.floor(position);
      const right = Math.min(values.length - 1, left + 1);
      return values[left]! + (values[right]! - values[left]!) * (position - left);
    });
  }
  return Array.from({ length: count }, (_, index) => {
    const from = Math.floor((index / count) * values.length);
    const to = Math.max(from + 1, Math.floor(((index + 1) / count) * values.length));
    let sum = 0;
    for (let i = from; i < to; i++) sum += values[i]!;
    return sum / (to - from);
  });
}

/** Нормирует ряд в 0…1; `invert` — меньше значит выше (темп: быстрее — выше). */
export function normalizeSeries(values: number[], invert = false): number[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (!(range > 0)) return values.map(() => 0.5);
  return values.map((value) => {
    const normalized = (value - min) / range;
    return invert ? 1 - normalized : normalized;
  });
}

function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]!;
}

export type TelemetrySeries = {
  /** Подробный ряд значений (`TELEMETRY_SAMPLES` точек через равные отрезки дистанции). */
  values: number[];
  average: number;
  best: number;
};

/**
 * Темп по дистанции, с/км. Остановки и рывки GPS отсекаются по 5–95-му процентилю,
 * затем ряд сглаживается — иначе график «рвёт» на светофорах.
 */
export function getPaceSeries(track: ITrackPoint[]): TelemetrySeries | null {
  const samples = measureTrack(track);
  const times = sampleAt(samples, TELEMETRY_SAMPLES + 1, (sample) => sample.time) as number[];
  const total = samples[samples.length - 1]?.distance ?? 0;
  const totalTime = samples[samples.length - 1]?.time ?? 0;
  if (times.length < 2 || total <= 0 || totalTime <= 0) return null;

  const step = total / TELEMETRY_SAMPLES / 1000;
  const raw = times.slice(1).map((time, index) => (time - times[index]!) / step);
  const sorted = [...raw].filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const low = quantile(sorted, 0.05);
  const high = quantile(sorted, 0.95);
  const values = smoothSeries(raw.map((value) => Math.min(high, Math.max(low, value))));

  return {
    values,
    average: totalTime / (total / 1000),
    best: Math.min(...values),
  };
}

/** Пульс по дистанции; null — в GPX нет пульса. */
export function getHeartRateSeries(track: ITrackPoint[]): TelemetrySeries | null {
  const samples = measureTrack(track);
  const rates = samples.map((sample) => sample.heartRate).filter((rate) => rate !== null);
  if (rates.length < 2) return null;

  const raw = sampleAt(samples, TELEMETRY_SAMPLES, (sample) => sample.heartRate);
  const filled = raw.map((value) => value ?? rates[0]!);
  const values = smoothSeries(filled);
  return {
    values,
    average: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
    best: Math.max(...rates),
  };
}

export type TelemetrySplit = {
  /** Номер километра (1, 2, …). */
  km: number;
  /** Темп на отрезке, с/км. */
  pace: number;
  /** Длина отрезка, км (последний обычно неполный). */
  length: number;
};

/** Отрезки неполного последнего километра короче этого не показываем — темп там случайный. */
const MIN_LAST_SPLIT_KM = 0.2;

/** Сплиты по километрам: темп каждого км (последний — по фактической длине). */
export function getSplits(track: ITrackPoint[]): TelemetrySplit[] {
  const samples = measureTrack(track);
  const total = samples[samples.length - 1]?.distance ?? 0;
  if (samples.length < 2 || total <= 0) return [];

  const timeAt = (distance: number) => {
    let index = samples.findIndex((sample) => sample.distance >= distance);
    if (index <= 0) index = Math.max(1, index);
    const a = samples[index - 1]!;
    const b = samples[index]!;
    const span = b.distance - a.distance;
    const t = span > 0 ? (distance - a.distance) / span : 0;
    return a.time + (b.time - a.time) * t;
  };

  const splits: TelemetrySplit[] = [];
  for (let km = 1; (km - 1) * 1000 < total; km++) {
    const from = (km - 1) * 1000;
    const to = Math.min(km * 1000, total);
    const length = (to - from) / 1000;
    if (length < MIN_LAST_SPLIT_KM && km > 1) break;
    splits.push({ km, length, pace: (timeAt(to) - timeAt(from)) / length });
  }
  return splits;
}

export type HeartRateZone = {
  /** Z1…Z5. */
  zone: number;
  /** Доля времени в зоне, 0…1. */
  share: number;
  /** Нижняя граница зоны, уд/мин. */
  from: number;
};

/** Границы зон в долях максимального пульса (классические 50/60/70/80/90%). */
const ZONE_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9];

/**
 * Время в пульсовых зонах. Максимум пульса — наибольший за тренировку
 * (своего максимума у нас нет); время ниже Z1 не учитывается.
 */
export function getHeartRateZones(track: ITrackPoint[]): HeartRateZone[] | null {
  const samples = measureTrack(track);
  const rates = samples.map((sample) => sample.heartRate).filter((rate) => rate !== null);
  if (rates.length < 2) return null;

  const max = Math.max(...rates);
  const bounds = ZONE_BOUNDS.map((share) => share * max);
  const time = [0, 0, 0, 0, 0];
  for (let index = 1; index < samples.length; index++) {
    const rate = samples[index]!.heartRate;
    const dt = samples[index]!.time - samples[index - 1]!.time;
    if (rate === null || !(dt > 0) || dt > 60) continue;
    let zone = -1;
    bounds.forEach((bound, i) => {
      if (rate >= bound) zone = i;
    });
    if (zone >= 0) time[zone]! += dt;
  }

  const sum = time.reduce((total, value) => total + value, 0);
  if (sum <= 0) return null;
  return time.map((value, index) => ({
    zone: index + 1,
    share: value / sum,
    from: Math.round(bounds[index]!),
  }));
}
