import { parseGPX } from '@we-gold/gpxjs'

import type { IActivity, ITrackPoint } from '../model/activity.types'

function getExtensionNumber(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const extension = value as Record<string, unknown>
  const result = extension[key]
  return typeof result === 'number' ? result : undefined
}

export async function parseGpx(file: File): Promise<IActivity> {
  const xml = await file.text()

  const [parsedFile, error] = parseGPX(xml)

  if (error || !parsedFile) {
    throw new Error(`Ошибка парсинга GPX: ${error?.message ?? 'Неизвестная ошибка'}`)
  }

  const track = parsedFile.tracks[0]

  if (!track) {
    throw new Error('GPX файл не содержит треков')
  }

  if (!track.points.length) {
    throw new Error('GPX трек не содержит точек')
  }

  const points: ITrackPoint[] = track.points.map((point) => {
    const extensions = point.extensions

    const trackPointExtension =
      extensions && typeof extensions === 'object' ? extensions['TrackPointExtension'] : undefined

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      elevation: point.elevation ?? 0,
      timestamp: point.time ?? new Date(),
      heartRate: getExtensionNumber(trackPointExtension, 'hr'),
      cadence: getExtensionNumber(trackPointExtension, 'cad'),
    }
  })

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  if (!firstPoint || !lastPoint) {
    throw new Error('GPX трек не содержит достаточно точек')
  }

  const durationSeconds = track.duration.movingDuration
  const distanceMeters = track.distance.total

  const averagePaceSecondsPerKm = distanceMeters > 0 ? durationSeconds / (distanceMeters / 1000) : 0

  return {
    id: crypto.randomUUID(),
    name: track.name ?? parsedFile.metadata.name ?? 'Пробежка',
    startedAt: firstPoint.timestamp,
    finishedAt: lastPoint.timestamp,
    durationSeconds,
    distanceMeters,
    averagePaceSecondsPerKm,
    track: points,
  }
}
