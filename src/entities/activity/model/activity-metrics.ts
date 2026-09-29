import type { ITrackPoint } from './activity.types';

export type IActivityMetrics = {
  currentDistanceMeters: number;
  totalDistanceMeters: number;
  currentPaceSecondsPerKm: number | null;
  averagePaceSecondsPerKm: number | null;
  currentHeartRate: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  currentCadence: number | null;
  averageCadence: number | null;
  currentElevation: number | null;
  currentGradePercent: number | null;
};

export function getActivityMetrics(
  track: ITrackPoint[],
  currentTimeSeconds: number,
): IActivityMetrics {
  if (track.length === 0) {
    return getEmptyMetrics();
  }

  const firstPoint = track[0];

  if (!firstPoint) {
    return getEmptyMetrics();
  }

  const distances = getTrackDistances(track);
  const totalDistanceMeters = distances[distances.length - 1] ?? 0;

  const lastPoint = track[track.length - 1];

  if (!lastPoint) {
    return getEmptyMetrics();
  }

  const totalDurationSeconds =
    (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000;

  const averagePaceSecondsPerKm =
    totalDistanceMeters > 0 && totalDurationSeconds > 0
      ? totalDurationSeconds / (totalDistanceMeters / 1000)
      : null;

  const heartRateStats = getHeartRateStats(track);
  const averageCadence = getAverageCadence(track);

  const targetTime = firstPoint.timestamp.getTime() + currentTimeSeconds * 1000;
  const currentIndex = findCurrentTrackIndex(track, targetTime);

  if (currentIndex < 0) {
    return {
      ...getEmptyMetrics(),
      totalDistanceMeters,
      averagePaceSecondsPerKm,
      averageHeartRate: heartRateStats.average,
      maxHeartRate: heartRateStats.max,
      averageCadence,
    };
  }

  const currentPoint = track[currentIndex];

  if (!currentPoint) {
    return {
      ...getEmptyMetrics(),
      totalDistanceMeters,
      averagePaceSecondsPerKm,
      averageHeartRate: heartRateStats.average,
      maxHeartRate: heartRateStats.max,
      averageCadence,
    };
  }

  const previousPoint = track[currentIndex - 1];
  const currentDistanceMeters = distances[currentIndex] ?? 0;

  const currentGradePercent = previousPoint ? getGradePercent(previousPoint, currentPoint) : 0;

  return {
    currentDistanceMeters,
    totalDistanceMeters,
    currentPaceSecondsPerKm: getCurrentPaceSecondsPerKm(track, currentIndex),
    averagePaceSecondsPerKm,
    currentHeartRate: currentPoint.heartRate ?? null,
    averageHeartRate: heartRateStats.average,
    maxHeartRate: heartRateStats.max,
    currentCadence:
      currentPoint.cadence !== undefined && currentPoint.cadence > 0 ? currentPoint.cadence : null,
    averageCadence,
    currentElevation: currentPoint.elevation,
    currentGradePercent,
  };
}

function findCurrentTrackIndex(track: ITrackPoint[], targetTime: number): number {
  if (track.length === 0) {
    return -1;
  }

  let left = 0;
  let right = track.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const point = track[middle];

    if (!point) {
      break;
    }

    if (point.timestamp.getTime() <= targetTime) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return Math.max(0, Math.min(right, track.length - 1));
}

function getTrackDistances(track: ITrackPoint[]): number[] {
  const distances = [0];

  for (let index = 1; index < track.length; index += 1) {
    const previous = track[index - 1];
    const current = track[index];

    if (!previous || !current) {
      distances.push(distances[index - 1] ?? 0);
      continue;
    }

    const segmentDistance = getDistanceMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );

    distances.push((distances[index - 1] ?? 0) + segmentDistance);
  }

  return distances;
}

function getCurrentPaceSecondsPerKm(track: ITrackPoint[], currentIndex: number): number | null {
  if (currentIndex <= 0) {
    return null;
  }

  const current = track[currentIndex];
  const previous = track[currentIndex - 1];

  if (!current || !previous) {
    return null;
  }

  const timeDelta = (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

  if (timeDelta <= 0) {
    return null;
  }

  const distanceMeters = getDistanceMeters(
    previous.latitude,
    previous.longitude,
    current.latitude,
    current.longitude,
  );

  if (distanceMeters <= 0) {
    return null;
  }

  return timeDelta / (distanceMeters / 1000);
}

function getHeartRateStats(track: ITrackPoint[]): {
  average: number | null;
  max: number | null;
} {
  let sum = 0;
  let count = 0;
  let max = 0;

  for (const point of track) {
    const heartRate = point.heartRate;

    if (heartRate === undefined || heartRate <= 0) {
      continue;
    }

    sum += heartRate;
    count += 1;
    max = Math.max(max, heartRate);
  }

  if (count === 0) {
    return {
      average: null,
      max: null,
    };
  }

  return {
    average: sum / count,
    max,
  };
}

function getAverageCadence(track: ITrackPoint[]): number | null {
  let sum = 0;
  let count = 0;

  for (const point of track) {
    const cadence = point.cadence;

    if (cadence === undefined || cadence <= 0) {
      continue;
    }

    sum += cadence;
    count += 1;
  }

  return count > 0 ? sum / count : null;
}

function getGradePercent(previous: ITrackPoint, current: ITrackPoint): number {
  const distanceMeters = getDistanceMeters(
    previous.latitude,
    previous.longitude,
    current.latitude,
    current.longitude,
  );

  if (distanceMeters <= 0) {
    return 0;
  }

  return ((current.elevation - previous.elevation) / distanceMeters) * 100;
}

function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const latitude1Radians = toRadians(latitude1);
  const latitude2Radians = toRadians(latitude2);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1Radians) * Math.cos(latitude2Radians) * Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getEmptyMetrics(): IActivityMetrics {
  return {
    currentDistanceMeters: 0,
    totalDistanceMeters: 0,
    currentPaceSecondsPerKm: null,
    averagePaceSecondsPerKm: null,
    currentHeartRate: null,
    averageHeartRate: null,
    maxHeartRate: null,
    currentCadence: null,
    averageCadence: null,
    currentElevation: null,
    currentGradePercent: null,
  };
}
