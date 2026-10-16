import { describe, expect, it } from 'vitest';
import type { ITrackPoint } from '@/entities/activity/model/activity.types';
import {
  ELEVATION_STYLE_SAMPLES,
  SHARE_ELEVATION_STYLES,
  buildElevationShapes,
  getElevationProfile,
} from '../activity-share-elevation';

function track(elevations: number[]): ITrackPoint[] {
  return elevations.map((elevation, index) => ({
    latitude: 55.75,
    longitude: 37.6 + index * 0.001,
    elevation,
    timestamp: new Date(index * 1000),
  }));
}

describe('getElevationProfile', () => {
  it('нормирует высоту в 0…1 через равные отрезки дистанции', () => {
    const profile = getElevationProfile(track([100, 120, 140, 160, 180, 200, 200, 200]), 10);
    expect(profile.values).toHaveLength(10);
    expect(Math.min(...profile.values)).toBeCloseTo(0);
    expect(Math.max(...profile.values)).toBeCloseTo(1);
    expect(profile.flat).toBe(false);
  });

  it('без перепада высот — плоский профиль', () => {
    const profile = getElevationProfile(track([0, 0, 0, 0]), 5);
    expect(profile.flat).toBe(true);
    expect(profile.values).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
  });

  it('шум GPS не превращается в набор высоты', () => {
    // Подъём на 50 м с шумом ±6 м в каждой точке.
    const noisy = Array.from({ length: 400 }, (_, index) => 100 + index / 8 + (index % 2 ? 6 : -6));
    const profile = getElevationProfile(track(noisy), 20);
    expect(profile.gain).toBeGreaterThan(40);
    expect(profile.gain).toBeLessThan(60);
  });

  it('пустой трек не падает', () => {
    expect(getElevationProfile([], 4).flat).toBe(true);
  });
});

describe('buildElevationShapes', () => {
  it('столбцы не выходят за область графика', () => {
    const shapes = buildElevationShapes([0, 0.5, 1], 'bars', 300, 100, 10);
    expect(shapes.rects).toHaveLength(3);
    for (const rect of shapes.rects) {
      expect(rect.y).toBeGreaterThanOrEqual(10);
      expect(rect.y + rect.height).toBeCloseTo(100);
      expect(rect.x + rect.width).toBeLessThanOrEqual(300);
    }
  });

  it('«Подъёмы» приглушают участки под гору', () => {
    const shapes = buildElevationShapes([0.2, 0.8, 0.4], 'climbs', 300, 100, 0);
    expect(shapes.rects.map((rect) => rect.faded)).toEqual([false, false, true]);
  });

  it('заливка замкнута до низа', () => {
    const shapes = buildElevationShapes([0, 1], 'area', 100, 50, 0);
    expect(shapes.area).toMatch(/L100 50 L0 50 Z$/);
  });
});

describe('стили графика', () => {
  it.each(SHARE_ELEVATION_STYLES.map((style) => style.id))('«%s» рисует фигуры', (style) => {
    const values = Array.from({ length: ELEVATION_STYLE_SAMPLES[style] }, (_, i) => (i % 5) / 4);
    const shapes = buildElevationShapes(values, style, 300, 100, 8);
    expect(Boolean(shapes.line) || shapes.rects.length > 0 || shapes.dots.length > 0).toBe(true);
  });
});
