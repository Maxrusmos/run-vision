import type { IActivity, ITrackPoint } from '@/entities/activity/model/activity.types';
import { getDistanceMeters } from '@/entities/activity/model/elevation-profile';
import type { ShareElevationStyle } from './activity-share.types';
import {
  ELEVATION_STYLE_SAMPLES,
  getElevationChartTop,
  getElevationMarker,
} from './activity-share-elevation';
import { resampleSeries } from './activity-share-telemetry';
import type { RouteFlagPoint } from './route-flags';

/** Длительность видео на выбор, секунды. */
export const VIDEO_DURATIONS = [5, 10, 15, 20] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export const DEFAULT_VIDEO_DURATION: VideoDuration = 10;

/** Точка стоит на финише последние секунды видео — успеть прочитать итог. */
export const VIDEO_FINISH_HOLD_SECONDS = 1;
/** Показатели меняются не чаще раза в столько секунд видео — чтобы цифры не мельтешили. */
export const VIDEO_STAT_UPDATE_SECONDS = 0.5;
export const VIDEO_FPS = 30;

/** Быстрее — уже не стояние: точка с такой скоростью считается движением (м/с). */
const MOVING_SPEED_MIN = 0.5;

/**
 * Трек, подготовленный для анимации: точки с координатами, накопленная дистанция и
 * время в движении. Индексы — как у `projectRoute`/`getKmMarkers` (тоже без точек
 * без координат), поэтому положение точки на линии трека берётся по тем же индексам.
 */
export type TrackTimeline = {
  /** Индекс в исходном `track` для каждой точки с координатами. */
  sourceIndex: number[];
  distances: Float64Array;
  movingSeconds: Float64Array;
  totalDistance: number;
  totalMoving: number;
};

export type TrackLocation = {
  /** Отрезок между точками `index` и `index + 1` (точки с координатами). */
  index: number;
  /** Доля пути внутри отрезка, 0…1. */
  t: number;
};

export function buildTrackTimeline(track: ITrackPoint[]): TrackTimeline {
  const sourceIndex: number[] = [];
  for (let index = 0; index < track.length; index++) {
    const point = track[index]!;
    if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
      sourceIndex.push(index);
    }
  }

  const distances = new Float64Array(sourceIndex.length);
  const movingSeconds = new Float64Array(sourceIndex.length);
  for (let index = 1; index < sourceIndex.length; index++) {
    const a = track[sourceIndex[index - 1]!]!;
    const b = track[sourceIndex[index]!]!;
    const distance = getDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
    const seconds = (b.timestamp.getTime() - a.timestamp.getTime()) / 1000;
    const isMoving = seconds > 0 && distance / seconds >= MOVING_SPEED_MIN;
    distances[index] = distances[index - 1]! + distance;
    movingSeconds[index] = movingSeconds[index - 1]! + (isMoving ? seconds : 0);
  }

  const last = sourceIndex.length - 1;
  return {
    sourceIndex,
    distances,
    movingSeconds,
    totalDistance: last >= 0 ? distances[last]! : 0,
    totalMoving: last >= 0 ? movingSeconds[last]! : 0,
  };
}

/** Где точка, прошедшая долю `progress` дистанции (0…1). Бинарный поиск по дистанции. */
export function getTrackLocation(timeline: TrackTimeline, progress: number): TrackLocation {
  const { distances, totalDistance } = timeline;
  const count = distances.length;
  if (count < 2 || totalDistance <= 0) return { index: 0, t: 0 };

  const target = Math.min(1, Math.max(0, progress)) * totalDistance;
  let low = 0;
  let high = count - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (distances[middle]! <= target) low = middle;
    else high = middle;
  }
  const span = distances[high]! - distances[low]!;
  return { index: low, t: span > 0 ? Math.min(1, (target - distances[low]!) / span) : 0 };
}

/** Доля пройденного трека в момент `time` видео длиной `duration` (с паузой на финише). */
export function getRouteProgressAt(time: number, duration: number): number {
  const moving = Math.max(0.1, duration - VIDEO_FINISH_HOLD_SECONDS);
  return Math.min(1, Math.max(0, time / moving));
}

/**
 * Сколько секунд видео прошло с момента, когда точка дошла до доли `reach` дистанции
 * (флажок километра, финиш — 1). Отрицательное — ещё не дошла. Финиш достигается в начале
 * паузы на финише — флажок «выпрыгивает», пока точка стоит.
 */
export function getTimeSinceReach(time: number, reach: number, duration: number): number {
  const moving = Math.max(0.1, duration - VIDEO_FINISH_HOLD_SECONDS);
  return time - Math.min(1, Math.max(0, reach)) * moving;
}

/**
 * Доля трека для показателей: ступеньками по `VIDEO_STAT_UPDATE_SECONDS` видео.
 * Округление вверх — с первого кадра цифры уже не «—», а на финише точно итоговые.
 */
export function getStatProgress(progress: number, duration: number): number {
  const moving = Math.max(0.1, duration - VIDEO_FINISH_HOLD_SECONDS);
  const steps = Math.max(1, Math.round(moving / VIDEO_STAT_UPDATE_SECONDS));
  return Math.max(1, Math.ceil(progress * steps - 1e-9)) / steps;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Тренировка «до точки»: трек до места, где точка прошла долю `progress` дистанции,
 * с дистанцией, временем и темпом на этот момент. На финише совпадает с исходной
 * (дистанция и время в движении приводятся к значениям из GPX), поэтому последний
 * кадр видео показывает те же цифры, что и фото.
 */
export function getActivityAtProgress(
  activity: IActivity,
  timeline: TrackTimeline,
  progress: number,
): IActivity {
  if (progress >= 1 || timeline.sourceIndex.length < 2) return activity;

  const { index, t } = getTrackLocation(timeline, progress);
  const a = activity.track[timeline.sourceIndex[index]!]!;
  const bIndex = timeline.sourceIndex[index + 1] ?? timeline.sourceIndex[index]!;
  const b = activity.track[bIndex]!;

  const point: ITrackPoint = {
    ...a,
    latitude: lerp(a.latitude, b.latitude, t),
    longitude: lerp(a.longitude, b.longitude, t),
    elevation:
      Number.isFinite(a.elevation) && Number.isFinite(b.elevation)
        ? lerp(a.elevation, b.elevation, t)
        : a.elevation,
    timestamp: new Date(lerp(a.timestamp.getTime(), b.timestamp.getTime(), t)),
  };
  const track = [...activity.track.slice(0, timeline.sourceIndex[index]! + 1), point];

  const rawDistance = lerp(timeline.distances[index]!, timeline.distances[index + 1] ?? 0, t);
  const distanceScale =
    timeline.totalDistance > 0 ? activity.distanceMeters / timeline.totalDistance : 1;
  const distanceMeters = rawDistance * distanceScale;

  // Время в движении — по своим отрезкам, но в масштабе GPX: на финише совпадёт.
  const rawMoving = lerp(timeline.movingSeconds[index]!, timeline.movingSeconds[index + 1] ?? 0, t);
  const durationSeconds =
    timeline.totalMoving > 0
      ? (rawMoving / timeline.totalMoving) * activity.durationSeconds
      : (rawDistance / Math.max(timeline.totalDistance, 1e-9)) * activity.durationSeconds;

  return {
    ...activity,
    track,
    finishedAt: point.timestamp,
    distanceMeters,
    durationSeconds,
    averagePaceSecondsPerKm:
      distanceMeters > 0 && durationSeconds > 0 ? durationSeconds / (distanceMeters / 1000) : 0,
  };
}

/**
 * Точка, бегущая по треку, в единицах слоя трека: ореол, кольцо цвета текста и
 * сердцевина цвета трека. Одни размеры у SVG на карточке и у кадров видео (холст).
 */
export const VIDEO_DOT = { radius: 17, ring: 6, halo: 40, haloOpacity: 0.3 } as const;

export type VideoDotColors = { route: string; ring: string };

/** Рисует точку на холсте: `unit` — сколько пикселей холста в единице слоя трека. */
export function drawVideoDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  unit: number,
  colors: VideoDotColors,
) {
  context.save();
  context.globalAlpha = VIDEO_DOT.haloOpacity;
  context.fillStyle = colors.route;
  context.beginPath();
  context.arc(x, y, VIDEO_DOT.halo * unit, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = colors.ring;
  context.beginPath();
  context.arc(x, y, (VIDEO_DOT.radius + VIDEO_DOT.ring) * unit, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = colors.route;
  context.beginPath();
  context.arc(x, y, VIDEO_DOT.radius * unit, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/**
 * Маркер на графике (высота, темп, пульс): черта поперёк графика и точка на линии,
 * поменьше точки трека. Единицы — слоя трека, как у линии графика.
 */
export const VIDEO_CHART_MARKER = {
  line: 3,
  lineOpacity: 0.55,
  radius: 9,
  ring: 4,
  halo: 22,
} as const;

export type ChartPoint = { x: number; y: number };

/** Маркер графика: точка на линии и концы черты (у вертикальной «ленты» черта поперёк). */
export type ChartMarker = ChartPoint & { from: ChartPoint; to: ChartPoint };

/** Переводит маркер через преобразование точки (поворот «ленты», сдвиг и масштаб). */
export function mapChartMarker(
  marker: ChartMarker,
  map: (point: ChartPoint) => ChartPoint,
): ChartMarker {
  return { ...map(marker), from: map(marker.from), to: map(marker.to) };
}

/** Рисует маркер графика на холсте: `unit` — пикселей холста в единице слоя трека. */
export function drawChartMarker(
  context: CanvasRenderingContext2D,
  marker: ChartMarker,
  unit: number,
  colors: VideoDotColors,
) {
  const { line, lineOpacity, radius, ring, halo } = VIDEO_CHART_MARKER;
  context.save();
  context.globalAlpha = lineOpacity;
  context.strokeStyle = colors.ring;
  context.lineWidth = line * unit;
  context.beginPath();
  context.moveTo(marker.from.x, marker.from.y);
  context.lineTo(marker.to.x, marker.to.y);
  context.stroke();
  context.globalAlpha = VIDEO_DOT.haloOpacity;
  context.fillStyle = colors.route;
  context.beginPath();
  context.arc(marker.x, marker.y, halo * unit, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = colors.ring;
  context.beginPath();
  context.arc(marker.x, marker.y, (radius + ring) * unit, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = colors.route;
  context.beginPath();
  context.arc(marker.x, marker.y, radius * unit, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/**
 * Что рисует холст поверх кадра видео — в пикселях раскладки карточки; `unit` — таких
 * пикселей в единице слоя трека. Точки нет — трека нет на карточке; маркеры — по одному
 * на каждый график (график высоты, графики-виджеты), у каждого свой цвет.
 */
export type VideoMarks = {
  dot: { x: number; y: number; unit: number } | null;
  charts: (ChartMarker & { unit: number; color: string })[];
  /** Флажки километров и финиша — «выпрыгивают», когда до них доходит точка. */
  flags: (RouteFlagPoint & { unit: number })[];
};

/**
 * Маркер графика-профиля (`ProfileChart`) для доли `progress` дистанции — в пикселях
 * графика: точка на линии (тот же ряд под стиль и тот же запас сверху, что у графика),
 * черта — на всю высоту. `series` — подробный ряд 0…1, `unit` — пикселей в единице слоя.
 */
export function getProfileChartMarker(
  series: number[],
  style: ShareElevationStyle,
  progress: number,
  width: number,
  height: number,
  unit: number,
): ChartMarker {
  const values = resampleSeries(series, ELEVATION_STYLE_SAMPLES[style]);
  const top = getElevationChartTop(style, unit);
  const point = getElevationMarker(values, progress, width, height, top);
  return { ...point, from: { x: point.x, y: 0 }, to: { x: point.x, y: height } };
}
