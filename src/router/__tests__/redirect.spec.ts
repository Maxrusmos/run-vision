import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from '../redirect';

describe('getSafeRedirect', () => {
  it('пропускает внутренние пути', () => {
    expect(getSafeRedirect('/share')).toBe('/share');
    expect(getSafeRedirect('/share/photo/editor?x=1')).toBe('/share/photo/editor?x=1');
    expect(getSafeRedirect(['/share', '/other'])).toBe('/share');
  });

  it('не пускает внешние адреса и мусор', () => {
    expect(getSafeRedirect('https://evil.com')).toBeNull();
    expect(getSafeRedirect('//evil.com')).toBeNull();
    expect(getSafeRedirect('/\\evil.com')).toBeNull();
    expect(getSafeRedirect('share')).toBeNull();
    expect(getSafeRedirect(null)).toBeNull();
    expect(getSafeRedirect(undefined)).toBeNull();
  });

  it('не возвращает на страницы входа', () => {
    expect(getSafeRedirect('/login')).toBeNull();
    expect(getSafeRedirect('/register?redirect=/share')).toBeNull();
  });
});
