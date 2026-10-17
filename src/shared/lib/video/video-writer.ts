import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

/**
 * Запись кадров с холста в видео.
 *
 * Основной путь — WebCodecs (`VideoEncoder`) + mp4-muxer: кадры кодируются по одному
 * и быстрее реального времени, файл — MP4 (H.264), который открывается везде, в т.ч. в
 * галерее iPhone и в Instagram. Без WebCodecs (старые браузеры) — `MediaRecorder` по
 * `captureStream()` холста: кадры рисуются в реальном времени, формат — какой умеет браузер.
 */

export type VideoResult = { blob: Blob; extension: 'mp4' | 'webm' };

type CodecOption = { codec: string; muxer: 'avc' | 'vp9' };

/** H.264 High / Main / Baseline (уровень 4.0 — до 1080×1920), потом VP9 в том же MP4. */
const CODECS: readonly CodecOption[] = [
  { codec: 'avc1.640028', muxer: 'avc' },
  { codec: 'avc1.4d0028', muxer: 'avc' },
  { codec: 'avc1.42e028', muxer: 'avc' },
  { codec: 'vp09.00.40.08', muxer: 'vp9' },
];

/** Бит/с на пиксель кадра в секунду: ~8 Мбит/с для 1080×1350 при 30 к/с. */
const BITS_PER_PIXEL = 0.18;
/** Ключевой кадр раз в столько секунд. */
const KEYFRAME_INTERVAL_SECONDS = 2;
/** Сколько кадров может ждать кодировщика, прежде чем подождём его. */
const MAX_ENCODE_QUEUE = 6;

export type VideoWriterOptions = { width: number; height: number; fps: number };

export type VideoWriter = {
  addFrame: (canvas: HTMLCanvasElement) => Promise<void>;
  finish: () => Promise<VideoResult>;
  cancel: () => void;
};

async function findCodec(config: Omit<VideoEncoderConfig, 'codec'>): Promise<CodecOption | null> {
  for (const option of CODECS) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        ...config,
        codec: option.codec,
      });
      if (supported) return option;
    } catch {
      // Неизвестный кодек — пробуем следующий.
    }
  }
  return null;
}

/** Кодировщик MP4 через WebCodecs; null — браузер так не умеет (тогда `recordCanvas`). */
export async function createVideoWriter({
  width,
  height,
  fps,
}: VideoWriterOptions): Promise<VideoWriter | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;

  const config = {
    width,
    height,
    bitrate: Math.round(width * height * fps * BITS_PER_PIXEL),
    framerate: fps,
    avc: { format: 'avc' as const },
  };
  const option = await findCodec(config);
  if (!option) return null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: option.muxer, width, height, frameRate: fps },
    fastStart: 'in-memory',
  });

  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      failure = error;
    },
  });
  encoder.configure({ ...config, codec: option.codec });

  let index = 0;
  const frameDuration = 1_000_000 / fps;
  const keyframeEvery = Math.max(1, Math.round(fps * KEYFRAME_INTERVAL_SECONDS));

  return {
    async addFrame(canvas) {
      if (failure) throw failure;
      // Кодировщик не успевает — ждём, иначе в памяти копятся несжатые кадры.
      while (encoder.encodeQueueSize > MAX_ENCODE_QUEUE) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(index * frameDuration),
        duration: Math.round(frameDuration),
      });
      encoder.encode(frame, { keyFrame: index % keyframeEvery === 0 });
      frame.close();
      index++;
    },
    async finish() {
      await encoder.flush();
      if (failure) throw failure;
      encoder.close();
      muxer.finalize();
      return {
        blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }),
        extension: 'mp4',
      };
    },
    cancel() {
      if (encoder.state !== 'closed') encoder.close();
    },
  };
}

const RECORDER_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm',
];

export function canRecordCanvas(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

type RecordOptions = {
  fps: number;
  frameCount: number;
  /** Нарисовать кадр `index` на холсте (синхронно: запись идёт в реальном времени). */
  drawFrame: (index: number) => void;
  onProgress?: (fraction: number) => void;
};

/** Запасной путь без WebCodecs: запись холста в реальном времени. */
export function recordCanvas(
  canvas: HTMLCanvasElement,
  { fps, frameCount, drawFrame, onProgress }: RecordOptions,
): Promise<VideoResult> {
  const mimeType = RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: Math.round(canvas.width * canvas.height * fps * BITS_PER_PIXEL),
  });
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('Не удалось записать видео'));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const type = recorder.mimeType || mimeType || 'video/webm';
      resolve({
        blob: new Blob(chunks, { type }),
        extension: type.includes('mp4') ? 'mp4' : 'webm',
      });
    };

    drawFrame(0);
    recorder.start();
    const startedAt = performance.now();

    const tick = () => {
      const index = Math.floor(((performance.now() - startedAt) / 1000) * fps);
      if (index >= frameCount) {
        recorder.stop();
        return;
      }
      drawFrame(index);
      onProgress?.(index / frameCount);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
