export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) {
    return '—';
  }
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatHeartRate(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}`;
}

export function formatGrade(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

export function formatElevation(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)} м`;
}

export function formatPlaybackDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}
