const OBJECT_URL_TTL_MS = 60_000;

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_TTL_MS);
}

function canShareFile(file: File): boolean {
  return (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

export function isShareAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Открывает системное меню «Поделиться», если оно поддерживает файлы,
 * иначе скачивает PNG.
 */
export async function shareOrDownloadImage(dataUrl: string, baseName: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  const fileName = `${baseName}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  if (canShareFile(file)) {
    await navigator.share({ files: [file], title: baseName });
    return;
  }

  downloadBlob(blob, fileName);
}
