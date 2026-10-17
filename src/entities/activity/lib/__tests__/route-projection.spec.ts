import { describe, expect, it } from 'vitest';
import { getRouteBounds, orientRoute } from '../route-projection';

const VIEWPORT = { width: 200, height: 100, padding: 10 };
// Горизонтальный отрезок, вписанный по ширине.
const LINE = [
  { x: -90, y: 0 },
  { x: 0, y: 0 },
  { x: 90, y: 0 },
];

describe('orientRoute', () => {
  it('без поворота и наклона точки не меняются', () => {
    expect(orientRoute(LINE, { bearing: 0, pitch: 0 }, VIEWPORT)).toEqual(LINE);
  });

  it('поворот на 90° ставит отрезок вертикально и вписывает по высоте', () => {
    const points = orientRoute(LINE, { bearing: 90, pitch: 0 }, VIEWPORT);
    const bounds = getRouteBounds(points)!;
    expect(bounds.maxX - bounds.minX).toBeCloseTo(0);
    expect(bounds.maxY - bounds.minY).toBeCloseTo(80);
    // Угол как у карты: больше угол — против часовой, правый конец уходит вверх.
    expect(points[2]!.y).toBeLessThan(0);
  });

  it('наклон уменьшает дальний (верхний) край сильнее ближнего', () => {
    const square = [
      { x: -40, y: -40 },
      { x: 40, y: -40 },
      { x: 40, y: 40 },
      { x: -40, y: 40 },
    ];
    const [topLeft, topRight, bottomRight, bottomLeft] = orientRoute(
      square,
      { bearing: 0, pitch: 60 },
      { width: 100, height: 100, padding: 10 },
    );
    const top = topRight!.x - topLeft!.x;
    const bottom = bottomRight!.x - bottomLeft!.x;
    expect(top).toBeLessThan(bottom);
    // Всё вписано в область с отступом и стоит по центру.
    const bounds = getRouteBounds([topLeft!, topRight!, bottomRight!, bottomLeft!])!;
    expect(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)).toBeCloseTo(80);
    expect(bounds.minX + bounds.maxX).toBeCloseTo(0);
    expect(bounds.minY + bounds.maxY).toBeCloseTo(0);
  });

  it('одна точка не даёт NaN', () => {
    const [point] = orientRoute([{ x: 0, y: 0 }], { bearing: 30, pitch: 35 }, VIEWPORT);
    expect(Number.isFinite(point!.x) && Number.isFinite(point!.y)).toBe(true);
  });
});
