import type { IElevationPoint, ITrackPoint } from '../activity.types';

const EARTH_RADIUS_METERS = 6371000;

export type IElevationProfilePoint = {
  x: number;
  y: number;
};

export type IElevationStats = {
  minElevation: number;
  maxElevation: number;
  elevationDifference: number;
  totalAscentMeters: number;
  totalDescentMeters: number;
  averageElevation: number;
};

export type IElevationDisplayMode = 'classic' | 'ascent-descent' | 'elevation' | 'grade';

export function buildElevationPoints(track: ITrackPoint[]): IElevationPoint[] {
  if (track.length === 0) {
    return [];
  }

  const result: IElevationPoint[] = [];

  let distanceMeters = 0;

  for (let index = 0; index < track.length; index += 1) {
    const point = track[index];
    const previousPoint = track[index - 1];

    if (!point) {
      continue;
    }

    if (previousPoint) {
      distanceMeters += getDistanceMeters(
        previousPoint.latitude,
        previousPoint.longitude,
        point.latitude,
        point.longitude,
      );
    }

    result.push({
      distanceMeters,
      elevation: point.elevation,
    });
  }

  return result;
}

export function smoothElevationPoints(
  points: IElevationPoint[],
  windowSize = 7,
): IElevationPoint[] {
  if (points.length <= 2 || windowSize <= 1) {
    return points;
  }

  const normalizedWindowSize = windowSize % 2 === 0 ? windowSize + 1 : windowSize;

  const halfWindow = Math.floor(normalizedWindowSize / 2);

  return points.map((point, index) => {
    const startIndex = Math.max(0, index - halfWindow);
    const endIndex = Math.min(points.length - 1, index + halfWindow);

    let elevationSum = 0;
    let count = 0;

    for (let currentIndex = startIndex; currentIndex <= endIndex; currentIndex += 1) {
      const currentPoint = points[currentIndex];

      if (!currentPoint) {
        continue;
      }

      elevationSum += currentPoint.elevation;
      count += 1;
    }

    return {
      distanceMeters: point.distanceMeters,
      elevation: count > 0 ? elevationSum / count : point.elevation,
    };
  });
}

export function getElevationRange(points: IElevationPoint[]): {
  min: number;
  max: number;
} {
  if (points.length === 0) {
    return {
      min: 0,
      max: 0,
    };
  }

  let min = points[0]?.elevation ?? 0;
  let max = points[0]?.elevation ?? 0;

  for (const point of points) {
    min = Math.min(min, point.elevation);
    max = Math.max(max, point.elevation);
  }

  return {
    min,
    max,
  };
}

export function getElevationStats(points: IElevationPoint[]): IElevationStats {
  if (points.length === 0) {
    return {
      minElevation: 0,
      maxElevation: 0,
      elevationDifference: 0,
      totalAscentMeters: 0,
      totalDescentMeters: 0,
      averageElevation: 0,
    };
  }

  let minElevation = points[0]?.elevation ?? 0;
  let maxElevation = points[0]?.elevation ?? 0;

  let totalAscentMeters = 0;
  let totalDescentMeters = 0;

  let elevationSum = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (!point) {
      continue;
    }

    minElevation = Math.min(minElevation, point.elevation);

    maxElevation = Math.max(maxElevation, point.elevation);

    elevationSum += point.elevation;

    const previousPoint = points[index - 1];

    if (!previousPoint) {
      continue;
    }

    const elevationDelta = point.elevation - previousPoint.elevation;

    if (elevationDelta > 0) {
      totalAscentMeters += elevationDelta;
    }

    if (elevationDelta < 0) {
      totalDescentMeters += Math.abs(elevationDelta);
    }
  }

  return {
    minElevation,
    maxElevation,
    elevationDifference: maxElevation - minElevation,
    totalAscentMeters,
    totalDescentMeters,
    averageElevation: elevationSum / points.length,
  };
}

export function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const latitudeDelta = toRadians(latitude2 - latitude1);

  const longitudeDelta = toRadians(longitude2 - longitude1);

  const latitude1Radians = toRadians(latitude1);
  const latitude2Radians = toRadians(latitude2);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1Radians) * Math.cos(latitude2Radians) * Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
