import { describe, expect, it } from 'vitest';
import {
  PRO_ROUTE_STYLES,
  SHARE_ROUTE_STYLES,
  resolveRouteLayerColor,
  shiftColor,
  type RouteLayerColor,
} from '../activity-share-route-styles';

const palette = { route: '#ff0000', text: '#ffffff', background: '#000000' };

describe('shiftColor', () => {
  it('без сдвига цвет тот же', () => {
    expect(shiftColor('#3a7bd5', {})).toBe('#3a7bd5');
  });

  it('сдвигает тон по кругу', () => {
    expect(shiftColor('#ff0000', { hue: 120 })).toBe('#00ff00');
    expect(shiftColor('#ff0000', { hue: -120 })).toBe('#0000ff');
  });

  it('светлота: +1 — белый, −1 — чёрный, середина — между', () => {
    expect(shiftColor('#ff0000', { light: 1 })).toBe('#ffffff');
    expect(shiftColor('#ff0000', { light: -1 })).toBe('#000000');
    expect(shiftColor('#ff0000', { light: 0.5 })).toBe('#ff8080');
  });

  it('не #rrggbb — как есть', () => {
    expect(shiftColor('red', { hue: 90 })).toBe('red');
  });
});

describe('resolveRouteLayerColor', () => {
  it('цвета карточки, оттенок трека и фиксированный', () => {
    expect(resolveRouteLayerColor(undefined, palette)).toBe('#ff0000');
    expect(resolveRouteLayerColor('text', palette)).toBe('#ffffff');
    expect(resolveRouteLayerColor({ shift: { hue: 120 } }, palette)).toBe('#00ff00');
    expect(resolveRouteLayerColor('#123456', palette)).toBe('#123456');
  });
});

describe('стили трека', () => {
  const usesRoute = (color: RouteLayerColor | undefined) =>
    color === undefined || color === 'route' || typeof color === 'object';

  it('без пометки «свои цвета» стиль хоть где-то следует цвету трека', () => {
    for (const style of [...SHARE_ROUTE_STYLES, ...PRO_ROUTE_STYLES]) {
      const follows = style.layers.some((layer) =>
        layer.gradient
          ? layer.gradient === true || layer.gradient.some(usesRoute)
          : !layer.extrude && usesRoute(layer.color),
      );
      expect(follows, style.id).toBe(!style.ownColors);
    }
  });
});
