import { markRaw } from 'vue';
import type { IActivity } from '@/entities/activity/model/activity.types';
import { parseGpx } from '@/entities/activity/parser/gpx.parser';

/**
 * Демо-пробежка для превью сохранённых шаблонов, когда своя тренировка не загружена:
 * ~6 км петлёй по Москве (Нескучный сад — набережная), с высотой, пульсом и каденсом.
 * Собирается из GPX тем же парсером, что и настоящие файлы, — все расчёты совпадают.
 */

export const DEMO_ACTIVITY_NAME = 'Демо-пробежка';

const POINTS = 360;
const CENTER = { lat: 55.7205, lon: 37.5925 };
const START = Date.UTC(2026, 8, 12, 5, 0, 0);

function buildDemoGpx(): string {
  const points: string[] = [];
  let seconds = 0;
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    const angle = t * Math.PI * 2;
    // Неровная петля: вытянута вдоль реки, с «заливом» — чтобы трек был узнаваем как трек.
    const radiusLat = 0.0085 * (1 + 0.18 * Math.sin(angle * 3));
    const radiusLon = 0.0165 * (1 + 0.12 * Math.cos(angle * 2));
    const lat = CENTER.lat + radiusLat * Math.sin(angle);
    const lon = CENTER.lon + radiusLon * Math.cos(angle);
    const elevation = 150 + 14 * Math.sin(angle * 2 + 0.6) + 4 * Math.sin(angle * 7);
    const heartRate = Math.round(146 + 14 * t + 6 * Math.sin(angle * 5));
    const cadence = Math.round(84 + 3 * Math.sin(angle * 4));
    // ~5:50/км: шаг ~17 м на точку, темп слегка плавает.
    seconds += 6 + 0.6 * Math.sin(angle * 3);
    const time = new Date(START + seconds * 1000).toISOString();
    points.push(
      `<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${elevation.toFixed(1)}</ele>` +
        `<time>${time}</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${heartRate}</gpxtpx:hr>` +
        `<gpxtpx:cad>${cadence}</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunVision demo" xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><name>${DEMO_ACTIVITY_NAME}</name><trkseg>${points.join('')}</trkseg></trk>
</gpx>`;
}

let demoPromise: Promise<IActivity> | null = null;
let demoActivity: IActivity | null = null;

/** Демо-тренировка, если уже собрана (`loadDemoActivity`), иначе null. */
export function getLoadedDemoActivity(): IActivity | null {
  return demoActivity;
}

/** Демо-тренировка (собирается один раз). */
export function loadDemoActivity(): Promise<IActivity> {
  demoPromise ??= parseGpx(new File([buildDemoGpx()], 'demo.gpx', { type: 'application/gpx+xml' }))
    .then((activity) => (demoActivity = markRaw(activity)))
    .catch((error: unknown) => {
      demoPromise = null;
      throw error;
    });
  return demoPromise;
}
