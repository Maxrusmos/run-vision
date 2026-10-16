import { ref } from 'vue';
import { toCanvas, toPng } from 'html-to-image';
import { composeWithBackdrop } from '@/shared/lib/image/compose-backdrop';
import { sanitizeFileName } from '@/shared/lib/file/sanitize-file-name';
import {
  isShareAbortError,
  shareOrDownloadImage,
} from '@/shared/lib/image/share-or-download-image';
import { waitForImagesIn } from '@/shared/lib/image/wait-for-images';

const EXPORT_PIXEL_RATIO = 2;
const DEFAULT_FILE_NAME = 'runvision-activity';

type RenderOptions = {
  /** Цвет фона PNG; без него сохраняется прозрачность. */
  backgroundColor?: string;
};

/**
 * Рендер DOM-элемента в PNG и сохранение результата.
 */
export function useShareCardExport() {
  const isRendering = ref(false);
  const isSaving = ref(false);
  const image = ref('');

  async function render(element: HTMLElement, options: RenderOptions = {}): Promise<boolean> {
    if (isRendering.value) return false;

    isRendering.value = true;

    try {
      await document.fonts?.ready;
      await waitForImagesIn(element);

      // Фоновое фото рисуем на холст сами: из SVG html-to-image iOS Safari с первого
      // раза его не рисует (см. compose-backdrop.ts).
      const photo = element.querySelector<HTMLImageElement>('[data-export-backdrop]');
      if (photo) {
        const overlay = await toCanvas(element, {
          pixelRatio: EXPORT_PIXEL_RATIO,
          filter: (node) => node !== photo,
          style: { background: 'transparent' },
        });
        image.value = composeWithBackdrop({
          overlay,
          card: element,
          photo,
          backgroundColor: options.backgroundColor,
        });
      } else {
        image.value = await toPng(element, {
          pixelRatio: EXPORT_PIXEL_RATIO,
          ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
        });
      }

      return true;
    } catch (error) {
      console.error('Не удалось подготовить карточку:', error);
      return false;
    } finally {
      isRendering.value = false;
    }
  }

  async function save(name: string): Promise<void> {
    if (!image.value || isSaving.value) return;

    isSaving.value = true;

    try {
      await shareOrDownloadImage(image.value, sanitizeFileName(name, DEFAULT_FILE_NAME));
    } catch (error) {
      if (!isShareAbortError(error)) {
        console.error('Не удалось сохранить карточку:', error);
      }
    } finally {
      isSaving.value = false;
    }
  }

  return {
    image,
    isRendering,
    isSaving,
    render,
    save,
  };
}
