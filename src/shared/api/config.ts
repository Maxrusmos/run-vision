const DEFAULT_API_URL = 'http://localhost:3000';

/** Адрес бэкенда без завершающего `/`. */
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/** Сколько ждём ответа, прежде чем считать сервер недоступным. */
export const API_TIMEOUT_MS = 15_000;
