import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';

import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';

// Вместо IndexedDB — память: jsdom-файлы не проходят structuredClone из Node.
const memory = new Map<string, unknown>();
vi.mock('@/shared/lib/storage/idb-store', () => ({
  idbGet: async (key: string) => memory.get(key),
  idbSet: async (key: string, value: unknown) => void memory.set(key, value),
  idbDelete: async (key: string) => void memory.delete(key),
}));

const { persistWorkSession, resetWorkSessionForTests, restoreWorkSession, setupWorkSession } =
  await import('../work-session');
const { useActivityStore } = await import('../activity.store');
const { useShareStore } = await import('../share.store');
const { useShareDraftsStore } = await import('../share-drafts.store');

const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Утренний бег</name><trkseg>
    <trkpt lat="55.75" lon="37.61"><ele>150</ele><time>2026-09-12T05:00:00Z</time></trkpt>
    <trkpt lat="55.751" lon="37.612"><ele>151</ele><time>2026-09-12T05:01:00Z</time></trkpt>
    <trkpt lat="55.752" lon="37.614"><ele>152</ele><time>2026-09-12T05:02:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;
const gpxFile = () => new File([GPX], 'run.gpx', { type: 'application/gpx+xml' });

let urlCounter = 0;

function draft(backgroundImage: string | null = null) {
  return { presetId: 'sunset', backgroundImage, title: 'Утро' } as unknown as ShareCardSettings;
}

/** Новая «загрузка страницы» в той же вкладке: свежие сторы, тот же sessionStorage. */
async function reloadPage(): Promise<Pinia> {
  await resetWorkSessionForTests({ keepRecord: true });
  const pinia = createPinia();
  setActivePinia(pinia);
  setupWorkSession(pinia);
  return pinia;
}

beforeEach(async () => {
  memory.clear();
  sessionStorage.clear();
  urlCounter = 0;
  URL.createObjectURL = vi.fn(() => `blob:test/${++urlCounter}`);
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['photo'], { type: 'image/png' }) })),
  );
  await reloadPage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('work-session', () => {
  it('после перезагрузки возвращает тренировку, шаблон и черновики с фото', async () => {
    expect(await useActivityStore().importGpx(gpxFile())).toBe(true);
    useShareStore().setPhotoTemplate('topographic');
    useShareDraftsStore().saveDraft('topographic', draft('blob:old/photo'));
    await persistWorkSession();

    await reloadPage();
    expect(useActivityStore().activity).toBeNull();
    expect(await restoreWorkSession()).toBe(true);

    expect(useActivityStore().activity?.name).toBe('Утренний бег');
    expect(useShareStore().photoTemplateId).toBe('topographic');
    const restored = useShareDraftsStore().getDraft('topographic');
    expect(restored?.title).toBe('Утро');
    // Старый object URL после перезагрузки мёртв — фото получает новый.
    expect(restored?.backgroundImage).toMatch(/^blob:test\//);
  });

  it('новая сессия (другая вкладка) не восстанавливает чужую работу', async () => {
    await useActivityStore().importGpx(gpxFile());
    await persistWorkSession();

    sessionStorage.clear();
    await reloadPage();
    expect(await restoreWorkSession()).toBe(false);
    expect(useActivityStore().activity).toBeNull();
  });

  it('без загруженного GPX ничего не перезаписывает', async () => {
    await useActivityStore().importGpx(gpxFile());
    await persistWorkSession();

    await reloadPage();
    // Сторы ещё пустые (до восстановления) — сохранение не должно стереть работу.
    await persistWorkSession();
    expect(await restoreWorkSession()).toBe(true);
  });

  it('изменения сохраняются сами (с задержкой)', async () => {
    vi.useFakeTimers();
    try {
      await useActivityStore().importGpx(gpxFile());
      useShareStore().setPhotoTemplate('telemetry');
      await nextTick();
      await vi.runAllTimersAsync();
    } finally {
      vi.useRealTimers();
    }

    await reloadPage();
    expect(await restoreWorkSession()).toBe(true);
    expect(useShareStore().photoTemplateId).toBe('telemetry');
  });

  it('новый GPX сбрасывает черновики', async () => {
    await useActivityStore().importGpx(gpxFile());
    useShareDraftsStore().saveDraft('minimal', draft());
    await useActivityStore().importGpx(gpxFile());
    expect(useShareDraftsStore().drafts).toEqual({});
  });
});
