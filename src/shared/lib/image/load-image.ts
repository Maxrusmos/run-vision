/**
 * Загружает и декодирует картинку для холста (`drawImage`). Ошибка — null: кадр
 * нарисуется без неё, а не сорвёт весь экспорт.
 */
export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}
