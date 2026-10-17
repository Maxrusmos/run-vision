import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateEmail, validatePassword } from '../auth-validation';

describe('auth-validation', () => {
  it('email: обрезка, регистр, формат, длина', () => {
    expect(normalizeEmail('  A@B.Co ')).toBe('a@b.co');
    expect(validateEmail(' User@Mail.ru ')).toBeNull();
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('user@mail')).not.toBeNull();
    expect(validateEmail('us er@mail.ru')).not.toBeNull();
    expect(validateEmail(`${'a'.repeat(250)}@b.cd`)).not.toBeNull();
  });

  it('пароль: 8–128 символов, пробелы по краям считаются', () => {
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword(' 123456 ')).toBeNull();
    expect(validatePassword('x'.repeat(128))).toBeNull();
    expect(validatePassword('x'.repeat(129))).not.toBeNull();
  });
});
