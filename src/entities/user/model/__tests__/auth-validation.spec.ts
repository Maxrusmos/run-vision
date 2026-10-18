import { describe, expect, it } from 'vitest';
import { normalizeLogin, validateLogin, validatePassword } from '../auth-validation';

describe('auth-validation', () => {
  it('логин: обрезка, регистр, символы, длина', () => {
    expect(normalizeLogin('  RuNNer ')).toBe('runner');
    expect(validateLogin(' Runner_42 ')).toBeNull();
    expect(validateLogin('run.ner-x')).toBeNull();
    expect(validateLogin('')).not.toBeNull();
    expect(validateLogin('ab')).not.toBeNull();
    expect(validateLogin('a'.repeat(33))).not.toBeNull();
    expect(validateLogin('бегун')).not.toBeNull();
    expect(validateLogin('run ner')).not.toBeNull();
    expect(validateLogin('user@mail.ru')).toBe('Нужен логин, а не email');
    expect(validateLogin('_runner')).not.toBeNull();
  });

  it('пароль: 8–128 символов, пробелы по краям считаются', () => {
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword(' 123456 ')).toBeNull();
    expect(validatePassword('x'.repeat(128))).toBeNull();
    expect(validatePassword('x'.repeat(129))).not.toBeNull();
  });
});
