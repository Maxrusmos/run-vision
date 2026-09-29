import type { IElevationPoint } from '../activity.types';

import type { IElevationProfilePoint } from './elevation-calculations';

export type IElevationChartSegment = {
  start: IElevationProfilePoint;
  end: IElevationProfilePoint;
  elevationDelta: number;
  gradePercent: number;
  startElevation: number;
};

export function downsampleElevationPoints(
  points: IElevationPoint[],
  maxPoints: number,
): IElevationPoint[] {
  if (points.length <= maxPoints || maxPoints < 2) {
    return points;
  }

  const result: IElevationPoint[] = [];

  const lastIndex = points.length - 1;

  for (let index = 0; index < maxPoints; index += 1) {
    const normalizedIndex = index / (maxPoints - 1);

    const sourceIndex = Math.round(normalizedIndex * lastIndex);

    const point = points[sourceIndex];

    if (point) {
      result.push(point);
    }
  }

  return result;
}

export function getElevationSvgPoint(
  point: IElevationPoint,
  totalDistanceMeters: number,
  minElevation: number,
  maxElevation: number,
  width: number,
  height: number,
  padding: number,
): IElevationProfilePoint {
  const distanceRange = Math.max(totalDistanceMeters, 1);

  const elevationRange = Math.max(maxElevation - minElevation, 1);

  const x = padding + (point.distanceMeters / distanceRange) * (width - padding * 2);

  const normalizedElevation = (point.elevation - minElevation) / elevationRange;

  const y = height - padding - normalizedElevation * (height - padding * 2);

  return {
    x,
    y,
  };
}

export function getElevationSvgPoints(
  points: IElevationPoint[],
  minElevation: number,
  maxElevation: number,
  width: number,
  height: number,
  padding: number,
): IElevationProfilePoint[] {
  if (points.length === 0) {
    return [];
  }

  const totalDistanceMeters = points[points.length - 1]?.distanceMeters ?? 0;

  return points.map((point) =>
    getElevationSvgPoint(
      point,
      totalDistanceMeters,
      minElevation,
      maxElevation,
      width,
      height,
      padding,
    ),
  );
}

export function buildElevationLinePath(points: IElevationProfilePoint[]): string {
  if (points.length < 2) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function buildElevationAreaPath(
  points: IElevationProfilePoint[],
  height: number,
  padding: number,
): string {
  if (points.length < 2) {
    return '';
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    return '';
  }

  return [
    `M ${firstPoint.x} ${height - padding}`,
    `L ${firstPoint.x} ${firstPoint.y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${lastPoint.x} ${height - padding}`,
    'Z',
  ].join(' ');
}

export function getElevationChartSegments(
  points: IElevationPoint[],
  svgPoints: IElevationProfilePoint[],
): IElevationChartSegment[] {
  if (points.length < 2 || svgPoints.length < 2) {
    return [];
  }

  const segments: IElevationChartSegment[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];

    const point = points[index];

    const previousSvgPoint = svgPoints[index - 1];

    const svgPoint = svgPoints[index];

    if (!previousPoint || !point || !previousSvgPoint || !svgPoint) {
      continue;
    }

    const elevationDelta = point.elevation - previousPoint.elevation;

    const distanceDelta = point.distanceMeters - previousPoint.distanceMeters;

    const gradePercent = distanceDelta > 0 ? (elevationDelta / distanceDelta) * 100 : 0;

    segments.push({
      start: previousSvgPoint,
      end: svgPoint,
      elevationDelta,
      gradePercent,
      startElevation: previousPoint.elevation,
    });
  }

  return segments;
}
