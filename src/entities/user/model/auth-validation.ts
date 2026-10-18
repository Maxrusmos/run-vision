// Клиентская проверка полей — те же правила, что в контракте (`docs/api.md`, «Правила полей»).

export const LOGIN_MIN_LENGTH = 3;
export const LOGIN_MAX_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Логин как его сохранит сервер: без пробелов по краям, в нижнем регистре. */
export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

/** Ошибка логина или null: 3–32 символа, латиница, цифры и «_ . -», первая — буква или цифра. */
export function validateLogin(value: string): string | null {
  const login = normalizeLogin(value);
  if (!login) return 'Введите логин';
  // Привычка вводить почту: подсказываем прямо, а не «недопустимые символы».
  if (login.includes('@')) return 'Нужен логин, а не email';
  if (login.length < LOGIN_MIN_LENGTH) return `Логин — не меньше ${LOGIN_MIN_LENGTH} символов`;
  if (login.length > LOGIN_MAX_LENGTH) return `Логин — не больше ${LOGIN_MAX_LENGTH} символов`;
  if (!/^[a-z0-9._-]+$/.test(login)) return 'Только латинские буквы, цифры и символы _ . -';
  if (!/^[a-z0-9]/.test(login)) return 'Логин должен начинаться с буквы или цифры';
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
