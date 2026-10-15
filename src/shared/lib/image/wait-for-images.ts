async function waitForImage(image: HTMLImageElement): Promise<void> {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }

  if (image.naturalWidth === 0) {
    throw new Error(`Не удалось загрузить изображение: ${image.currentSrc || image.src}`);
  }

  await image.decode?.();
}

export async function waitForImagesIn(element: HTMLElement): Promise<void> {
  await Promise.all(Array.from(element.querySelectorAll('img')).map(waitForImage));
}
