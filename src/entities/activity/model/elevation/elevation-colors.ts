export function getElevationColor(
  elevation: number,
  minElevation: number,
  maxElevation: number,
): string {
  const range = Math.max(maxElevation - minElevation, 1);
  const progress = (elevation - minElevation) / range;
  const hue = 220 - progress * 160;
  return `hsl(${hue}, 70%, 50%)`;
}

export function getGradeColor(gradePercent: number): string {
  const intensity = Math.min(Math.abs(gradePercent) / 10, 1);
  if (gradePercent > 0) {
    const saturation = 45 + intensity * 35;
    return `hsl(8, ${saturation}%, 52%)`;
  }
  if (gradePercent < 0) {
    const saturation = 45 + intensity * 35;
    return `hsl(210, ${saturation}%, 52%)`;
  }
  return 'hsl(0, 0%, 55%)';
}

export function getGradePercent(
  previousDistanceMeters: number,
  previousElevation: number,
  distanceMeters: number,
  elevation: number,
): number {
  const distanceDelta = distanceMeters - previousDistanceMeters;
  if (distanceDelta <= 0) {
    return 0;
  }
  return ((elevation - previousElevation) / distanceDelta) * 100;
}
