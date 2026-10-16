import { describe, expect, it } from 'vitest';
import { findExtensionNumber, parseGpx } from '../gpx.parser';

type Point = { lat: number; lon: number; ele?: number; time?: string; ext?: string };

function gpx(tracks: Point[][], namespaces = ''): string {
  const trk = (points: Point[]) =>
    `<trk><name>Бег</name><trkseg>${points
      .map(
        (p) =>
          `<trkpt lat="${p.lat}" lon="${p.lon}">` +
          (p.ele !== undefined ? `<ele>${p.ele}</ele>` : '') +
          (p.time ? `<time>${p.time}</time>` : '') +
          (p.ext ? `<extensions>${p.ext}</extensions>` : '') +
          '</trkpt>',
      )
      .join('')}</trkseg></trk>`;
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1" ${namespaces}>${tracks.map(trk).join('')}</gpx>`;
}

/** Точки на восток по экватору: ~111 м между точками, раз в 30 с. */
function points(count: number, from = 0, extra: Partial<Point> = {}): Point[] {
  return Array.from({ length: count }, (_, index) => ({
    lat: 0,
    lon: (from + index) * 0.001,
    ele: 100 + index,
    time: new Date(Date.UTC(2026, 8, 26, 6, 0, (from + index) * 30)).toISOString(),
    ...extra,
  }));
}

function file(xml: string, name = 'run.gpx'): File {
  return new File([xml], name, { type: 'application/gpx+xml' });
}

describe('parseGpx', () => {
  it('читает пульс с любым префиксом пространства имён (Strava: gpxtpx)', async () => {
    const xml = gpx(
      [
        points(5, 0, {
          ext: '<gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr><gpxtpx:cad>85</gpxtpx:cad></gpxtpx:TrackPointExtension>',
        }),
      ],
      'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"',
    );
    const activity = await parseGpx(file(xml));
    expect(activity.track[0]!.heartRate).toBe(150);
    expect(activity.track[0]!.cadence).toBe(170);
  });

  it('склеивает несколько треков (<trk>) в одну тренировку', async () => {
    const single = await parseGpx(file(gpx([points(10)])));
    const split = await parseGpx(file(gpx([points(5), points(5, 5)])));
    expect(split.track).toHaveLength(10);
    expect(split.distanceMeters).toBeGreaterThan(single.distanceMeters * 0.85);
  });

  it('без времени: не подставляет «сейчас», помечает тренировку', async () => {
    const activity = await parseGpx(file(gpx([points(5, 0, { time: undefined })])));
    expect(activity.hasTimestamps).toBe(false);
    expect(activity.startedAt.getTime()).toBe(0);
    expect(activity.durationSeconds).toBe(0);
  });

  it('без высоты: NaN вместо нуля, тренировка помечена', async () => {
    const activity = await parseGpx(file(gpx([points(5, 0, { ele: undefined })])));
    expect(activity.hasElevation).toBe(false);
    expect(Number.isNaN(activity.track[0]!.elevation)).toBe(true);
  });

  it('обрезанный GPX — ошибка, а не половина трека', async () => {
    const xml = gpx([points(20)]);
    await expect(parseGpx(file(xml.slice(0, Math.floor(xml.length * 0.6))))).rejects.toThrow(
      /повреждён или обрезан/,
    );
  });

  it('не-GPX файл — понятное сообщение', async () => {
    await expect(parseGpx(file('просто текст', 'notes.txt'))).rejects.toThrow(/Это не GPX/);
    await expect(parseGpx(file('<?xml version="1.0"?><kml></kml>', 'map.kml'))).rejects.toThrow(
      /Это не GPX/,
    );
  });
});

describe('findExtensionNumber', () => {
  it('ищет по локальному имени во вложенных расширениях', () => {
    expect(findExtensionNumber({ 'ns3:TrackPointExtension': { 'ns3:hr': 140 } }, ['hr'])).toBe(140);
    expect(findExtensionNumber({ heartrate: '133' }, ['hr', 'heartrate'])).toBe(133);
    expect(findExtensionNumber({ 'x:speed': 3 }, ['hr'])).toBeUndefined();
  });
});
