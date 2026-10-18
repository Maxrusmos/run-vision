import { describe, expect, it } from 'vitest';
import type { ShareCardSettings } from '../activity-share.types';
import { getProDesignInUse, isDecorVisible } from '../activity-share-pro';
import { PRO_COLOR_PRESETS, findSharePresetByColors } from '../activity-share-presets';
import { SHARE_BACKGROUND_DECORS, getDecorStyle } from '../activity-share-decor';

const card = (patch: Partial<ShareCardSettings>) =>
  ({
    backgroundDecor: null,
    backgroundImage: null,
    transparentBackground: false,
    map: null,
    ...patch,
  }) as ShareCardSettings;

describe('Pro-оформления', () => {
  it('у каждого Pro-пресета свой существующий фон', () => {
    const decors = PRO_COLOR_PRESETS.map((preset) => preset.decor);
    expect(new Set(decors).size).toBe(decors.length);
    for (const preset of PRO_COLOR_PRESETS) {
      expect(preset.pro).toBe(true);
      expect(SHARE_BACKGROUND_DECORS.some((decor) => decor.id === preset.decor)).toBe(true);
    }
  });

  it('Pro-оформление в деле, только когда фон виден', () => {
    expect(getProDesignInUse(card({ backgroundDecor: 'aurora' }))?.name).toBe('Аврора');
    expect(getProDesignInUse(card({}))).toBeNull();
    // Под фото, прозрачностью и картой во весь фон градиента не видно — и Pro не нужен.
    expect(
      getProDesignInUse(card({ backgroundDecor: 'aurora', backgroundImage: 'blob:x' })),
    ).toBeNull();
    expect(
      getProDesignInUse(card({ backgroundDecor: 'aurora', transparentBackground: true })),
    ).toBeNull();
    expect(
      isDecorVisible(
        card({ backgroundDecor: 'topo', map: { layout: 'full' } as ShareCardSettings['map'] }),
      ),
    ).toBe(false);
  });

  it('ручная смена цвета находит пресет с учётом фона', () => {
    const aurora = PRO_COLOR_PRESETS[0]!;
    const colors = { background: aurora.background, route: aurora.route, text: aurora.text };
    expect(findSharePresetByColors({ ...colors, decor: aurora.decor })?.id).toBe(aurora.id);
    expect(findSharePresetByColors({ ...colors, decor: null })).toBeUndefined();
  });

  it('стиль фона: слои с размерами, узоры мельчают в плитке', () => {
    const style = getDecorStyle('peach', 0.5);
    expect(style.backgroundImage).toContain('6.5px');
    expect(style.backgroundImage!.split('gradient(').length - 1).toBe(2);
    expect(style.backgroundSize!.split(',').length).toBe(2);
  });
});
