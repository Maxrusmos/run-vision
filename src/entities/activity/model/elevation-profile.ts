export {
  buildElevationPoints,
  getDistanceMeters,
  getElevationRange,
  getElevationStats,
  smoothElevationPoints,
} from './elevation/elevation-calculations.ts';

export {
  buildElevationAreaPath,
  buildElevationLinePath,
  downsampleElevationPoints,
  getElevationChartSegments,
  getElevationSvgPoint,
  getElevationSvgPoints,
} from './elevation/elevation-chart.ts';

export type { IElevationChartSegment } from './elevation/elevation-chart.ts';

export { getElevationColor, getGradeColor, getGradePercent } from './elevation/elevation-colors.ts';

export { getElevationProgressPoint } from './elevation/elevation-playback.ts';

export type {
  IElevationDisplayMode,
  IElevationProfilePoint,
  IElevationStats,
} from './elevation/elevation-calculations.ts';
