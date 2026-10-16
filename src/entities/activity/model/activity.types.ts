export type ITrackPoint = {
  latitude: number;
  longitude: number;
  /** NaN — в GPX нет высоты (см. `IActivity.hasElevation`). */
  elevation: number;
  /** Время эпохи (0) у всех точек — в GPX нет времени (см. `IActivity.hasTimestamps`). */
  timestamp: Date;
  heartRate?: number;
  cadence?: number;
};

export type IActivity = {
  id: string;
  name: string;
  startedAt: Date;
  finishedAt: Date;
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSecondsPerKm: number;
  track: ITrackPoint[];
  /** В GPX есть время точек: без него нет даты, времени старта, темпа и сплитов. */
  hasTimestamps: boolean;
  /** В GPX есть высота: без неё нет набора, сброса и графика высоты. */
  hasElevation: boolean;
};

export type IElevationPoint = {
  distanceMeters: number;
  elevation: number;
};
