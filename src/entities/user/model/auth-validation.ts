// Клиентская проверка полей — те же правила, что в контракте (`docs/api.md`, «Правила полей»).

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email как его сохранит сервер: без пробелов по краям, в нижнем регистре. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Ошибка email или null. */
export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Введите email';
  if (email.length > EMAIL_MAX_LENGTH) return `Email длиннее ${EMAIL_MAX_LENGTH} символов`;
  if (!EMAIL_PATTERN.test(email)) return 'Неверный формат email';
  return null;
}

/** Ошибка пароля или null. Пробелы по краям не обрезаем — они часть пароля. */
export function validatePassword(value: string): string | null {
  if (!value) return 'Введите пароль';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Пароль — не меньше ${PASSWORD_MIN_LENGTH} символов`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Пароль — не больше ${PASSWORD_MAX_LENGTH} символов`;
  }
  return null;
}
