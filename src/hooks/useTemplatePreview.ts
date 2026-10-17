import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import { projectRoute, toSvgPolylinePoints } from '@/entities/activity/lib/route-projection';
import {
  formatClockDuration,
  formatPace,
  formatPlaybackDistance,
} from '@/shared/lib/formatters/formatters';

const PREVIEW_VIEWPORT = { width: 100, height: 100, padding: 12 };

/** Данные простого превью шаблона (`TemplateRoutePreview`): трек и подписи плашки. */
export function useTemplatePreview(activity: MaybeRefOrGetter<IActivity | null>) {
  const routePoints = computed(() => {
    const value = toValue(activity);
    return value ? toSvgPolylinePoints(projectRoute(value.track, PREVIEW_VIEWPORT)) : '';
  });

  const primaryLabel = computed(() => {
    const value = toValue(activity);
    return value ? `${formatPlaybackDistance(value.distanceMeters)} км` : '';
  });

  const secondaryLabel = computed(() => {
    const value = toValue(activity);
    if (!value) return '';
    const pace = value.averagePaceSecondsPerKm;
    const paceLabel = pace > 0 ? `${formatPace(pace)} /км` : '—';
    return `${formatClockDuration(value.durationSeconds)} · ${paceLabel}`;
  });

  return { routePoints, primaryLabel, secondaryLabel };
}
