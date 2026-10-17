import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import { buildElevationPoints } from '@/entities/activity/model/elevation-profile';
import type {
  ShareElevationSettings,
  ShareElevationSize,
  ShareElevationStyle,
} from './activity-share.types';

export function createShareElevationSettings(): ShareElevationSettings {
  return { visible: true, style: 'area', size: 'medium', color: null, labels: true, row: null };
}

export const SHARE_ELEVATION_STYLES: readonly { id: ShareElevationStyle; name: string }[] = [
  { id: 'area', name: 'Заливка' },
  { id: 'line', name: 'Линия' },
  { id: 'silhouette', name: 'Силуэт' },
  { id: 'bars', name: 'Столбцы' },
  { id: 'climbs', name: 'Подъёмы' },
  { id: 'steps', name: 'Ступени' },
  { id: 'strokes', name: 'Штрихи' },
  { id: 'dots', name: 'Точки' },
  { id: 'wave', name: 'Волна' },
  { id: 'glow', name: 'Свечение' },
  { id: 'gradient', name: 'Градиент' },
  { id: 'mountain', name: 'Горы' },
  { id: 'ridges', name: 'Хребты' },
  { id: 'lollipop', name: 'Пины' },
  { id: 'dashed', name: 'Пунктир' },
  { id: 'contour', name: 'Изолинии' },
];

export const SHARE_ELEVATION_SIZES: readonly {
  id: ShareElevationSize;
  label: string;
  title: string;
  /** Высота графика относительно ширины контента карточки. */
  ratio: number;
}[] = [
  { id: 'small', label: 'S', title: 'Низкий', ratio: 0.14 },
  { id: 'medium', label: 'M', title: 'Средний', ratio: 0.2 },
  { id: 'large', label: 'L', title: 'Высокий', ratio: 0.28 },
];

export function getElevationSizeRatio(size: ShareElevationSize): number {
  return SHARE_ELEVATION_SIZES.find((option) => option.id === size)?.ratio ?? 0.2;
}

/** Точек в подробном профиле: шаг ~0,25% дистанции. */
const FINE_SAMPLES = 400;
/**
 * Радиус сглаживания в точках подробного профиля (~1,5% дистанции в каждую сторону).
 * GPS-высота шумит на ±5–15 м — без сглаживания по дистанции график «пилой»,
 * а набор высоты завышен в разы.
 */
const SMOOTH_RADIUS = 6;
/** Порог набора/сброса: колебания меньше — шум, а не подъём. */
const CLIMB_THRESHOLD_METERS = 3;
/** Перепад меньше этого считаем плоским маршрутом (или высоты в GPX нет). */
const FLAT_RANGE_METERS = 1;

export type ElevationProfile = {
  /** Высота в равномерных по дистанции точках, 0…1 от минимума до максимума. */
  values: number[];
  min: number;
  max: number;
  gain: number;
  loss: number;
  /** В GPX нет перепада высот — график плоский. */
  flat: boolean;
};

/** Высота через `count` равных отрезков дистанции (GPS пишет точки неравномерно). */
function resample(track: ITrackPoint[], count: number): number[] {
  const points = buildElevationPoints(track).filter((point) => Number.isFinite(point.elevation));
  const total = points[points.length - 1]?.distanceMeters ?? 0;
  if (points.length < 2 || total <= 0) return [];

  const result: number[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    const distance = (index / (count - 1)) * total;
    while (cursor < points.length - 2 && points[cursor + 1]!.distanceMeters < distance) cursor++;
    const a = points[cursor]!;
    const b = points[cursor + 1]!;
    const span = b.distanceMeters - a.distanceMeters;
    const t = span > 0 ? Math.min(1, Math.max(0, (distance - a.distanceMeters) / span)) : 0;
    result.push(a.elevation + (b.elevation - a.elevation) * t);
  }
  return result;
}

/** Скользящее среднее; два прохода дают сглаживание, близкое к гауссову. */
function smooth(values: number[], radius: number): number[] {
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

/** Набор и сброс с порогом: считаем только перепады больше CLIMB_THRESHOLD_METERS. */
function getClimbs(values: number[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  let anchor = values[0] ?? 0;
  for (const value of values) {
    const delta = value - anchor;
    if (Math.abs(delta) < CLIMB_THRESHOLD_METERS) continue;
    if (delta > 0) gain += delta;
    else loss -= delta;
    anchor = value;
  }
  return { gain, loss };
}

/** Профиль высоты для графика: `samples` равномерных по дистанции точек. */
export function getElevationProfile(track: ITrackPoint[], samples: number): ElevationProfile {
  const fine = smooth(resample(track, FINE_SAMPLES), SMOOTH_RADIUS);
  const min = fine.length ? Math.min(...fine) : 0;
  const max = fine.length ? Math.max(...fine) : 0;
  const range = max - min;
  const flat = !fine.length || !(range >= FLAT_RANGE_METERS);
  const { gain, loss } = getClimbs(fine);

  const values = Array.from({ length: samples }, (_, index) => {
    if (flat) return 0.5;
    const position = (index / Math.max(1, samples - 1)) * (fine.length - 1);
    const left = Math.floor(position);
    const right = Math.min(fine.length - 1, left + 1);
    const elevation = fine[left]! + (fine[right]! - fine[left]!) * (position - left);
    return (elevation - min) / range;
  });

  return { values, min, max, gain, loss, flat };
}

/** Точек в профиле, который рисует график (дальше `ProfileChart` пересчитывает под стиль). */
export const ELEVATION_SERIES_SAMPLES = 400;

/** Сколько точек профиля нужно стилю. */
export const ELEVATION_STYLE_SAMPLES: Record<ShareElevationStyle, number> = {
  area: 120,
  line: 120,
  silhouette: 120,
  bars: 40,
  climbs: 40,
  steps: 28,
  strokes: 72,
  dots: 36,
  wave: 64,
  glow: 120,
  gradient: 120,
  mountain: 120,
  ridges: 120,
  lollipop: 32,
  dashed: 120,
  contour: 120,
};

export type ElevationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  faded?: boolean;
};
export type ElevationDot = { cx: number; cy: number; r: number };

export type ElevationShapes = {
  /** Линия профиля (обводка). */
  line: string | null;
  /** Замкнутая до низа область под профилем. */
  area: string | null;
  rects: ElevationRect[];
  dots: ElevationDot[];
};

/** Нижняя «подложка» значений: даже минимум высоты остаётся видимым. */
const FLOOR = 0.12;

/**
 * Фигуры графика в координатах `width × height` (0,0 — левый верхний угол).
 * `top` — отступ сверху (под подписи и толщину линии).
 */
/** Запас сверху графика (пиксели), чтобы толстая линия и ореол «Свечения» на пике не обрезались. */
export function getElevationChartTop(style: ShareElevationStyle, unit: number): number {
  return (style === 'glow' ? 16 : 9) * unit;
}

/**
 * Видео: где на графике точка, прошедшая долю `progress` дистанции. Высота — по тому же
 * правилу, что у линии графика (`buildElevationShapes`), по подробному ряду профиля.
 */
export function getElevationMarker(
  values: number[],
  progress: number,
  width: number,
  height: number,
  top: number,
): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, progress));
  const position = clamped * Math.max(0, values.length - 1);
  const left = Math.floor(position);
  const right = Math.min(values.length - 1, left + 1);
  const value = values.length
    ? values[left]! + (values[right]! - values[left]!) * (position - left)
    : 0.5;
  const level = FLOOR + (1 - FLOOR) * value;
  return { x: clamped * width, y: height - level * (height - top) };
}

export function buildElevationShapes(
  values: number[],
  style: ShareElevationStyle,
  width: number,
  height: number,
  top: number,
): ElevationShapes {
  const shapes: ElevationShapes = { line: null, area: null, rects: [], dots: [] };
  const count = values.length;
  if (!count) return shapes;

  const usable = height - top;
  const level = (value: number) => FLOOR + (1 - FLOOR) * value;
  const y = (value: number) => height - level(value) * usable;
  const round = (value: number) => Math.round(value * 10) / 10;

  const lineThrough = (xs: number[], ys: number[]) =>
    xs.map((x, index) => `${index ? 'L' : 'M'}${round(x)} ${round(ys[index]!)}`).join(' ');

  switch (style) {
    case 'area':
    case 'line':
    case 'silhouette':
    case 'glow':
    case 'gradient':
    case 'mountain':
    case 'ridges':
    case 'dashed':
    case 'contour': {
      const xs = values.map((_, index) => (index / Math.max(1, count - 1)) * width);
      const ys = values.map(y);
      shapes.line = lineThrough(xs, ys);
      shapes.area = `${shapes.line} L${width} ${height} L0 ${height} Z`;
      break;
    }
    case 'steps': {
      const step = width / count;
      const parts = values.map((value, index) => {
        const yy = round(y(value));
        return `${index ? 'L' : 'M'}${round(index * step)} ${yy} L${round((index + 1) * step)} ${yy}`;
      });
      shapes.line = parts.join(' ');
      shapes.area = `${shapes.line} L${width} ${height} L0 ${height} Z`;
      break;
    }
    case 'bars':
    case 'climbs':
    case 'strokes': {
      const step = width / count;
      const barWidth = step * (style === 'strokes' ? 0.32 : 0.62);
      values.forEach((value, index) => {
        const barTop = y(value);
        shapes.rects.push({
          x: round(index * step + (step - barWidth) / 2),
          y: round(barTop),
          width: round(barWidth),
          height: round(height - barTop),
          // «Подъёмы»: участки в гору — полным цветом, под гору — бледнее.
          faded: style === 'climbs' && index > 0 && value < values[index - 1]!,
        });
      });
      break;
    }
    case 'wave': {
      const step = width / count;
      const barWidth = step * 0.5;
      const middle = top + usable / 2;
      values.forEach((value, index) => {
        const half = (level(value) * usable) / 2;
        shapes.rects.push({
          x: round(index * step + (step - barWidth) / 2),
          y: round(middle - half),
          width: round(barWidth),
          height: round(half * 2),
        });
      });
      break;
    }
    case 'lollipop': {
      // Тонкая ножка и кружок на вершине — как булавки на карте.
      const step = width / count;
      const r = Math.min(step * 0.24, usable * 0.08);
      values.forEach((value, index) => {
        const cx = round(index * step + step / 2);
        const cy = round(Math.max(top + r, y(value)));
        const stem = Math.max(1, step * 0.1);
        shapes.rects.push({
          x: round(cx - stem / 2),
          y: cy,
          width: round(stem),
          height: round(height - cy),
        });
        shapes.dots.push({ cx, cy, r: round(r) });
      });
      break;
    }
    case 'dots': {
      const step = width / count;
      const r = step * 0.3;
      const rows = Math.max(1, Math.floor(usable / step));
      values.forEach((value, index) => {
        const filled = Math.max(1, Math.round(level(value) * rows));
        for (let row = 0; row < filled; row++) {
          shapes.dots.push({
            cx: round(index * step + step / 2),
            cy: round(height - step / 2 - row * step),
            r: round(r),
          });
        }
      });
      break;
    }
  }

  return shapes;
}
