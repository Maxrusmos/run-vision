import { describe, expect, it } from 'vitest';
import {
  FLAG_POP_SECONDS,
  ROUTE_FLAG,
  getFinishFlagShape,
  getFlagPopScale,
  getKmFlagShape,
} from '../route-flags';
import { VIDEO_FINISH_HOLD_SECONDS, getTimeSinceReach } from '../activity-share-video';

describe('getFlagPopScale', () => {
  it('до флажка точка не дошла — его нет; потом вырастает с перелётом и встаёт', () => {
    expect(getFlagPopScale(-0.01)).toBe(0);
    expect(getFlagPopScale(0)).toBeCloseTo(0);
    const samples = Array.from({ length: 46 }, (_, index) => getFlagPopScale(index / 100));
    expect(Math.max(...samples)).toBeGreaterThan(1.05);
    expect(Math.max(...samples)).toBeLessThan(1.35);
    expect(getFlagPopScale(FLAG_POP_SECONDS)).toBe(1);
    expect(getFlagPopScale(10)).toBe(1);
  });
});

describe('getTimeSinceReach', () => {
  it('километр — по доле дистанции, финиш — в начале паузы на финише', () => {
    const duration = 10;
    const moving = duration - VIDEO_FINISH_HOLD_SECONDS;
    expect(getTimeSinceReach(0, 0.5, duration)).toBeCloseTo(-moving / 2);
    expect(getTimeSinceReach(moving / 2, 0.5, duration)).toBeCloseTo(0);
    // В покое (конец ролика) финишный флажок уже давно «выпрыгнул».
    expect(getFlagPopScale(getTimeSinceReach(duration, 1, duration))).toBe(1);
  });
});

describe('геометрия флажков', () => {
  it('древко — от точки трека вверх, полотнище справа', () => {
    const shape = getKmFlagShape({ x: 100, y: 200 }, '12', 2);
    expect(shape.pole).toEqual({ x1: 100, y1: 200, x2: 100, y2: 200 - ROUTE_FLAG.pole * 2 });
    expect(shape.banner.x).toBe(100);
    expect(shape.banner.width).toBe((ROUTE_FLAG.padding * 2 + ROUTE_FLAG.digitWidth * 2) * 2);
    expect(shape.text.x).toBe(100 + shape.banner.width / 2);
  });

  it('финиш — клетки 3 × 2 в шахматном порядке', () => {
    const shape = getFinishFlagShape({ x: 0, y: 100 }, 1);
    expect(shape.cells).toHaveLength(6);
    expect(shape.cells.filter((cell) => cell.dark)).toHaveLength(3);
    expect(shape.frame.width).toBe((ROUTE_FLAG.height / 2) * 3);
  });
});
