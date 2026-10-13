export type ShareStatKey =
  | 'distance'
  | 'duration'
  | 'averagePace'
  | 'averageHeartRate'
  | 'maxHeartRate'
  | 'averageCadence'
  | 'elevationGain';

export type ShareColorPreset = {
  id: string;
  name: string;
  background: string;
  route: string;
  text: string;
};

export type ShareStatWidth = 'half' | 'full';

export type ShareCardSettings = {
  backgroundColor: string;
  routeColor: string;
  textColor: string;
  presetId: string | null;
  visibleStats: ShareStatKey[];
  statWidths: Partial<Record<ShareStatKey, ShareStatWidth>>;
  transparentBackground: boolean;
  showStatBorders: boolean;
  backgroundImage: string | null;
  backgroundImageFit: 'cover' | 'contain';
  backgroundImagePosition: string;
  statSpacing: number;
};

export type ShareStatOption = {
  key: ShareStatKey;
  label: string;
  shortLabel: string;
};
