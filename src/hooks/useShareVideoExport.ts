import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { toCanvas } from 'html-to-image';
import {
  VIDEO_FPS,
  drawElevationMarker,
  drawVideoDot,
  getRouteProgressAt,
  getStatProgress,
  type VideoDotColors,
  type VideoMarks,
} from '@/entities/activity/model/activity-share/activity-share-video';
import { composeBackdropCanvas } from '@/shared/lib/image/compose-backdrop';
import { waitForImagesIn } from '@/shared/lib/image/wait-for-images';
import { sanitizeFileName } from '@/shared/lib/file/sanitize-file-name';
import { isShareAbortError, shareOrDownloadFile } from '@/shared/lib/image/share-or-download-image';
import {
  canRecordCanvas,
  createVideoWriter,
  recordCanvas,
  type VideoResult,
} from '@/shared/lib/video/video-writer';

/** Ширина видео: 1080 — как у историй и постов. */
const VIDEO_WIDTH = 1080;
/** Без WebCodecs кадры заранее держатся в памяти — поменьше, чтобы iPhone не выгрузил вкладку. */
const RECORDER_VIDEO_WIDTH = 720;
const DEFAULT_FILE_NAME = 'runvision-activity';

type RenderVideoOptions = {
  /** Карточка в документе (её рендерим в кадры). */
  element: HTMLElement;
  duration: number;
  /**
   * Показать на карточке показатели на долю `statProgress` и дождаться отрисовки.
   * Возвращает ключ значений: одинаковые цифры подряд не рендерятся заново.
   */
  showStatsAt: (statProgress: number) => Promise<string>;
  /** Точка на треке и маркер графика высоты в пикселях раскладки карточки. */
  getMarks: (progress: number) => VideoMarks;
  dotColors: VideoDotColors;
  /** Цвета маркера на графике высоты (у графика может быть свой цвет). */
  elevationColors: VideoDotColors;
  backgroundColor: string;
};

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

/** Карточка (без точки и маркера — на время записи их нет) в холст размером кадра. */
async function renderCard(
  element: HTMLElement,
  pixelRatio: number,
  backgroundColor: string,
): Promise<HTMLCanvasElement> {
  const photo = element.querySelector<HTMLImageElement>('[data-export-backdrop]');
  if (!photo) return toCanvas(element, { pixelRatio, backgroundColor });
  // Фото фона — на холст напрямую (iOS не рисует его из SVG с первого раза).
  const overlay = await toCanvas(element, {
    pixelRatio,
    filter: (node) => node !== photo,
    style: { background: 'transparent' },
  });
  return composeBackdropCanvas({ overlay, card: element, photo, backgroundColor });
}

/**
 * Видео карточки: точка бежит по треку, показатели меняются ступеньками.
 * Карточка рендерится html-to-image только при смене цифр (раз в полсекунды видео),
 * а точку на каждом кадре рисует холст поверх — иначе на телефоне это минуты.
 */
export function useShareVideoExport() {
  const isRendering = ref(false);
  /** Готовность видео, 0…1. */
  const progress = ref(0);
  const isSaving = ref(false);
  const video = shallowRef<(VideoResult & { url: string }) | null>(null);
  let isCancelled = false;

  function clearVideo() {
    if (video.value) URL.revokeObjectURL(video.value.url);
    video.value = null;
  }

  onBeforeUnmount(() => {
    isCancelled = true;
    clearVideo();
  });

  async function render(options: RenderVideoOptions): Promise<boolean> {
    if (isRendering.value) return false;
    isRendering.value = true;
    isCancelled = false;
    progress.value = 0;
    clearVideo();

    try {
      const result = await renderFrames(options);
      if (!result || isCancelled) return false;
      video.value = { ...result, url: URL.createObjectURL(result.blob) };
      return true;
    } catch (error) {
      console.error('Не удалось создать видео:', error);
      return false;
    } finally {
      isRendering.value = false;
    }
  }

  async function renderFrames({
    element,
    duration,
    showStatsAt,
    getMarks,
    dotColors,
    elevationColors,
    backgroundColor,
  }: RenderVideoOptions): Promise<VideoResult | null> {
    await document.fonts?.ready;
    await waitForImagesIn(element);

    const frameCount = Math.round(duration * VIDEO_FPS);
    const frames = Array.from({ length: frameCount }, (_, index) => {
      const routeProgress = getRouteProgressAt(index / VIDEO_FPS, duration);
      return {
        marks: getMarks(routeProgress),
        statProgress: getStatProgress(routeProgress, duration),
      };
    });

    const sizeFor = (width: number) => {
      const pixelRatio = width / element.offsetWidth;
      return {
        pixelRatio,
        size: { width: even(width), height: even(element.offsetHeight * pixelRatio) },
      };
    };

    let { pixelRatio, size } = sizeFor(VIDEO_WIDTH);
    const writer = await createVideoWriter({ ...size, fps: VIDEO_FPS });
    if (!writer) {
      if (!canRecordCanvas()) throw new Error('Браузер не умеет записывать видео');
      ({ pixelRatio, size } = sizeFor(RECORDER_VIDEO_WIDTH));
    }

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D недоступен');

    const drawFrame = (background: CanvasImageSource, { dot, elevation }: VideoMarks) => {
      // Под скруглёнными углами карточки — цвет фона: в видео нет прозрачности.
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(background, 0, 0, size.width, size.height);
      if (elevation) {
        drawElevationMarker(
          context,
          {
            x: elevation.x * pixelRatio,
            y: elevation.y * pixelRatio,
            top: elevation.top * pixelRatio,
            bottom: elevation.bottom * pixelRatio,
          },
          elevation.unit * pixelRatio,
          elevationColors,
        );
      }
      if (dot) {
        drawVideoDot(
          context,
          dot.x * pixelRatio,
          dot.y * pixelRatio,
          dot.unit * pixelRatio,
          dotColors,
        );
      }
    };

    // Фон кадра для каждой ступеньки показателей (одинаковые цифры — один рендер).
    let lastKey: string | null = null;
    let lastBackground: HTMLCanvasElement | null = null;
    const backgroundFor = async (statProgress: number) => {
      const key = await showStatsAt(statProgress);
      if (key !== lastKey || !lastBackground) {
        lastBackground = await renderCard(element, pixelRatio, backgroundColor);
        lastKey = key;
      }
      return lastBackground;
    };

    if (writer) {
      for (let index = 0; index < frameCount; index++) {
        if (isCancelled) {
          writer.cancel();
          return null;
        }
        const frame = frames[index]!;
        drawFrame(await backgroundFor(frame.statProgress), frame.marks);
        await writer.addFrame(canvas);
        progress.value = (index + 1) / frameCount;
      }
      return writer.finish();
    }

    // Без WebCodecs запись идёт в реальном времени — все фоны готовим заранее.
    const backgrounds = new Map<number, HTMLCanvasElement>();
    const steps = [...new Set(frames.map((frame) => frame.statProgress))];
    for (const [index, step] of steps.entries()) {
      if (isCancelled) return null;
      backgrounds.set(step, await backgroundFor(step));
      progress.value = ((index + 1) / steps.length) * 0.5;
    }
    return recordCanvas(canvas, {
      fps: VIDEO_FPS,
      frameCount,
      drawFrame: (index) => {
        const frame = frames[index]!;
        drawFrame(backgrounds.get(frame.statProgress)!, frame.marks);
      },
      onProgress: (fraction) => {
        progress.value = 0.5 + fraction * 0.5;
      },
    });
  }

  async function save(name: string): Promise<void> {
    if (!video.value || isSaving.value) return;
    isSaving.value = true;
    try {
      await shareOrDownloadFile(
        video.value.blob,
        sanitizeFileName(name, DEFAULT_FILE_NAME),
        video.value.extension,
      );
    } catch (error) {
      if (!isShareAbortError(error)) console.error('Не удалось сохранить видео:', error);
    } finally {
      isSaving.value = false;
    }
  }

  return { isRendering, progress, isSaving, video, render, save };
}
