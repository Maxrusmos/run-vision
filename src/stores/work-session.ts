import { watch } from 'vue';
import type { Pinia } from 'pinia';

import type {
  PhotoTemplateId,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { idbDelete, idbGet, idbSet } from '@/shared/lib/storage/idb-store';
import { useActivityStore } from '@/stores/activity.store';
import {
  useShareDraftsStore,
  type ShareDraftLinks,
  type ShareDrafts,
} from '@/stores/share-drafts.store';
import { useShareStore } from '@/stores/share.store';

/**
 * Работа в рамках сессии вкладки: GPX, выбранный шаблон и черновики карточек
 * переживают перезагрузку страницы (iOS Safari выгружает вкладку, пока пользователь
 * в другом приложении — например, делится картинкой). Данные — в IndexedDB,
 * а метка сессии — в sessionStorage: новая вкладка или новый запуск начинают с нуля.
 */

const RECORD_KEY = 'work-session';
const SESSION_ID_KEY = 'rv.work-session';
const PERSIST_DELAY_MS = 400;

export interface WorkSessionRecord {
  version: 1;
  sessionId: string;
  gpx: File;
  shareType: ShareType;
  photoTemplateId: PhotoTemplateId;
  /** Шаблон видео (в старых записях нет). */
  videoTemplateId?: PhotoTemplateId;
  drafts: ShareDrafts;
  /** Из каких сохранённых шаблонов открыты черновики. */
  links?: ShareDraftLinks;
  /** Фото фона черновиков: object URL на момент сохранения → файл. */
  images: Record<string, Blob>;
}

function readSessionId(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/** Метка текущей сессии вкладки; без sessionStorage — своя на каждую загрузку страницы. */
function ensureSessionId(): string {
  const existing = readSessionId();
  if (existing) return existing;

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    window.sessionStorage.setItem(SESSION_ID_KEY, id);
  } catch {
    // Без sessionStorage работа не переживёт перезагрузку — приложение работает и так.
  }
  return id;
}

let sessionId = '';
let pinia: Pinia | null = null;
let restorePromise: Promise<boolean> | null = null;
let persistTimer: number | undefined;
/** Файлы фото фона по их object URL: чтобы не читать заново при каждом сохранении. */
const imageBlobs = new Map<string, Blob>();

async function readImage(url: string): Promise<Blob | null> {
  const cached = imageBlobs.get(url);
  if (cached) return cached;
  try {
    const blob = await (await fetch(url)).blob();
    imageBlobs.set(url, blob);
    return blob;
  } catch {
    return null;
  }
}

/** Сохранить текущую работу в IndexedDB (без GPX сохранять нечего). */
export async function persistWorkSession(): Promise<void> {
  window.clearTimeout(persistTimer);
  persistTimer = undefined;
  if (!pinia) return;

  const activityStore = useActivityStore(pinia);
  const shareStore = useShareStore(pinia);
  const draftsStore = useShareDraftsStore(pinia);
  const gpx = activityStore.sourceFile;
  if (!gpx) return;

  const drafts = draftsStore.drafts;
  const images: Record<string, Blob> = {};
  // Фото фона и фото точки видео — файлами: object URL после перезагрузки недействительны.
  for (const draft of Object.values(drafts)) {
    for (const url of [draft?.backgroundImage, draft?.videoDot?.photo]) {
      if (!url || images[url]) continue;
      const blob = await readImage(url);
      if (blob) images[url] = blob;
    }
  }

  const record: WorkSessionRecord = {
    version: 1,
    sessionId,
    gpx,
    shareType: shareStore.shareType,
    photoTemplateId: shareStore.photoTemplateId,
    videoTemplateId: shareStore.videoTemplateId,
    drafts: JSON.parse(JSON.stringify(drafts)) as ShareDrafts,
    links: { ...draftsStore.links },
    images,
  };
  await idbSet(RECORD_KEY, record);
}

function schedulePersist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => void persistWorkSession(), PERSIST_DELAY_MS);
}

async function runRestore(): Promise<boolean> {
  if (!pinia) return false;
  const record = await idbGet<WorkSessionRecord>(RECORD_KEY);
  if (!record || record.version !== 1 || record.sessionId !== sessionId) return false;

  const activityStore = useActivityStore(pinia);
  // Пока читали базу, пользователь мог загрузить новый GPX — его не трогаем.
  if (activityStore.activity) return false;
  if (!(await activityStore.restoreFromFile(record.gpx))) return false;

  const shareStore = useShareStore(pinia);
  shareStore.setShareType(record.shareType);
  shareStore.setPhotoTemplate(record.photoTemplateId);
  if (record.videoTemplateId) shareStore.setVideoTemplate(record.videoTemplateId);

  // Старые object URL после перезагрузки недействительны — создаём новые из файлов.
  const urls = new Map<string, string>();
  for (const [oldUrl, blob] of Object.entries(record.images ?? {})) {
    const url = URL.createObjectURL(blob);
    urls.set(oldUrl, url);
    imageBlobs.set(url, blob);
  }
  const drafts: ShareDrafts = {};
  for (const [id, draft] of Object.entries(record.drafts ?? {})) {
    if (!draft) continue;
    const image = draft.backgroundImage ? (urls.get(draft.backgroundImage) ?? null) : null;
    const dotPhoto = draft.videoDot?.photo ? (urls.get(draft.videoDot.photo) ?? null) : null;
    drafts[id] = {
      ...draft,
      backgroundImage: image,
      ...(draft.videoDot ? { videoDot: { ...draft.videoDot, photo: dotPhoto } } : {}),
    };
  }
  useShareDraftsStore(pinia).setDrafts(drafts, record.links ?? {});
  return true;
}

/**
 * Вернуть работу этой сессии после перезагрузки. Повторные вызовы ждут первый.
 * Возвращает true, если тренировка восстановлена.
 */
export function restoreWorkSession(): Promise<boolean> {
  restorePromise ??= runRestore().catch(() => false);
  return restorePromise;
}

/** Подключить сохранение: вызывается один раз при старте приложения. */
export function setupWorkSession(app: Pinia) {
  pinia = app;
  const isNewSession = readSessionId() === null;
  sessionId = ensureSessionId();
  // Работа прошлой сессии больше не понадобится — не держим чужой GPX и фото.
  if (isNewSession) void idbDelete(RECORD_KEY);

  const activityStore = useActivityStore(app);
  const shareStore = useShareStore(app);
  const draftsStore = useShareDraftsStore(app);

  watch(
    () => [
      activityStore.sourceFile,
      shareStore.shareType,
      shareStore.photoTemplateId,
      shareStore.videoTemplateId,
      draftsStore.drafts,
      draftsStore.links,
    ],
    schedulePersist,
  );

  // Вкладку прячут (переключились в другое приложение) — iOS может её выгрузить: сохраняем сразу.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && persistTimer !== undefined) {
      void persistWorkSession();
    }
  });
}

/** Для тестов: забыть состояние модуля (как при перезагрузке страницы). */
export async function resetWorkSessionForTests({ keepRecord = false } = {}) {
  window.clearTimeout(persistTimer);
  persistTimer = undefined;
  restorePromise = null;
  pinia = null;
  imageBlobs.clear();
  if (!keepRecord) await idbDelete(RECORD_KEY);
}
