import { describe, expect, it } from 'vitest';
import { getObjectFitRect, parseObjectPosition } from '../compose-backdrop';

const center = parseObjectPosition('50% 50%');

describe('getObjectFitRect', () => {
  it('cover: широкое фото в высокой рамке — обрезка по бокам, по центру', () => {
    expect(getObjectFitRect(200, 100, 100, 100, 'cover', center)).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it('contain: фото целиком, поля сверху и снизу', () => {
    expect(getObjectFitRect(200, 100, 100, 100, 'contain', center)).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
  });

  it('object-position: левый верхний край', () => {
    const rect = getObjectFitRect(200, 100, 100, 100, 'cover', parseObjectPosition('left top'));
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(0);
  });
});

describe('parseObjectPosition', () => {
  it('понимает проценты, пиксели и ключевые слова', () => {
    expect(parseObjectPosition('50% 50%')).toEqual([{ fraction: 0.5 }, { fraction: 0.5 }]);
    expect(parseObjectPosition('10px 100%')).toEqual([{ pixels: 10 }, { fraction: 1 }]);
    expect(parseObjectPosition('center')).toEqual([{ fraction: 0.5 }, { fraction: 0.5 }]);
    expect(parseObjectPosition('top')).toEqual([{ fraction: 0.5 }, { fraction: 0 }]);
  });
});
