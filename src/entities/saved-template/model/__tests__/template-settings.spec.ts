import { describe, expect, it } from 'vitest';
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import { isSameTemplateSettings, toTemplateSettings } from '../template-settings';

const base = {
  title: 'Утренний бег',
  backgroundImage: 'blob:photo',
  backgroundColor: '#111111',
  routeColor: '#ffffff',
  statPositions: { distance: { row: 0, col: 0 } },
} as unknown as ShareCardSettings;

describe('template-settings', () => {
  it('шаблон не хранит фото фона и текст названия', () => {
    const result = toTemplateSettings(base);
    expect(result.backgroundImage).toBeNull();
    expect(result.title).toBeNull();
    expect(result.routeColor).toBe('#ffffff');
    // Копия, а не та же ссылка.
    expect(result.statPositions).not.toBe(base.statPositions);
  });

  it('сравнение не зависит от порядка ключей (jsonb их переставляет), фото и названия', () => {
    const fromServer = JSON.parse(
      '{"statPositions":{"distance":{"col":0,"row":0}},"routeColor":"#ffffff","backgroundColor":"#111111","backgroundImage":null,"title":null}',
    ) as ShareCardSettings;
    expect(isSameTemplateSettings(base, fromServer)).toBe(true);
    expect(isSameTemplateSettings({ ...base, routeColor: '#000000' }, fromServer)).toBe(false);
  });

  it('фото точки видео в шаблон не попадает, стиль точки — попадает', () => {
    const result = toTemplateSettings({
      ...base,
      videoDot: { style: 'neon', photo: 'blob:face' },
    });
    expect(result.videoDot).toEqual({ style: 'neon', photo: null });
  });

  it('старый шаблон без точки видео совпадает с карточкой с точкой по умолчанию', () => {
    const withDot = {
      ...base,
      videoDot: { style: 'classic', photo: null },
    } as ShareCardSettings;
    expect(isSameTemplateSettings(withDot, base)).toBe(true);
  });
});
