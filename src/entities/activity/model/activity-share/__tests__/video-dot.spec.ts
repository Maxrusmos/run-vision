import { describe, expect, it } from 'vitest';
import { VIDEO_DOT_BUBBLE, VIDEO_DOT_STYLES, getVideoDotLayers } from '../video-dot';

describe('getVideoDotLayers', () => {
  it('у каждого стиля свои слои с центром на треке', () => {
    for (const { id } of VIDEO_DOT_STYLES) {
      const layers = getVideoDotLayers({ style: id, photo: null });
      expect(layers.length).toBeGreaterThan(0);
      expect(layers.every((layer) => layer.kind === 'circle' && layer.cy === 0)).toBe(true);
    }
  });

  it('с фото — «пузырёк» над треком: круг с фото и хвостик к точке на треке', () => {
    const layers = getVideoDotLayers({ style: 'neon', photo: 'blob:face' });
    const photo = layers.find((layer) => layer.kind === 'photo');
    const tail = layers.find((layer) => layer.kind === 'polygon');
    expect(photo?.kind === 'photo' && photo.cy).toBeLessThan(0);
    // Кончик хвостика — над точкой, основание лежит на обводке круга.
    if (tail?.kind !== 'polygon' || photo?.kind !== 'photo') throw new Error('нет слоёв');
    const [left, , tip] = tail.points;
    expect(tip![1]).toBe(VIDEO_DOT_BUBBLE.tailTip);
    const outer = VIDEO_DOT_BUBBLE.photo + VIDEO_DOT_BUBBLE.border;
    expect(Math.hypot(left![0], left![1] - photo.cy)).toBeCloseTo(outer);
    // Последний слой — фото: поверх обводки.
    expect(layers[layers.length - 1]?.kind).toBe('photo');
  });
});
