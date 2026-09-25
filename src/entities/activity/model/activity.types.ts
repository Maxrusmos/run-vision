export type ITrackPoint = {
  latitude: number;
  longitude: number;
  elevation: number;
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
};

export type IElevationPoint = {
  distanceMeters: number;
  elevation: number;
};
