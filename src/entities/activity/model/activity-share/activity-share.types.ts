export type ShareType = 'photo' | 'video';

export type PhotoTemplateId = 'minimal' | 'topographic' | 'custom';

export type ShareStatKey =
  | 'distance'
  | 'duration'
  | 'averagePace'
  | 'averageHeartRate'
  | 'maxHeartRate'
  | 'averageCadence'
  | 'elevationGain';

export type ShareStatWidth = 'half' | 'full';

export type ShareColorKey = 'backgroundColor' | 'routeColor' | 'textColor';

export type ShareBackgroundImageFit = 'cover' | 'contain';

export type ShareColorPreset = {
  id: string;
  name: string;
  background: string;
  route: string;
  text: string;
};

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
  backgroundImageFit: ShareBackgroundImageFit;
  backgroundImagePosition: string;
  statSpacing: number;
};

export type ShareStatOption = {
  key: ShareStatKey;
  /** Название в списке добавления показателей. */
  label: string;
  /** Короткое название, которое выводится на карточке. */
  cardLabel: string;
};

export type ShareStat = {
  key: ShareStatKey;
  label: string;
  value: string;
};

export type PhotoTemplate = {
  id: Exclude<PhotoTemplateId, 'custom'>;
  title: string;
  description: string;
  presetId: string;
};
