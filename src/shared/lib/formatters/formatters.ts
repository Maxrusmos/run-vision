const EMPTY_VALUE = '—';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Формат «м:сс». Округляем до целых секунд до разбиения,
 * иначе 59.6 с превращались в «0:60».
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${pad2(total % 60)}`;
}

/**
 * Формат «ч:мм:сс» (или «м:сс», если меньше часа).
 */
export function formatClockDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return EMPTY_VALUE;
  }

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(remainingSeconds)}`;
  }

  return `${minutes}:${pad2(remainingSeconds)}`;
}

export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm)) {
    return EMPTY_VALUE;
  }
  return formatDuration(secondsPerKm);
}

export function formatHeartRate(value: number | null): string {
  return value === null ? EMPTY_VALUE : `${Math.round(value)}`;
}

export function formatGrade(value: number | null): string {
  return value === null ? EMPTY_VALUE : `${value.toFixed(1)}%`;
}

export function formatElevation(value: number | null): string {
  return value === null ? EMPTY_VALUE : `${Math.round(value)} м`;
}

export function formatPlaybackDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatActivityDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return EMPTY_VALUE;
  }

  const total = Math.floor(totalSeconds);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}ч`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}мин`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}с`);
  }

  return parts.join(' ');
}

export function formatActivityDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
