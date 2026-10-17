import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { dragTrash, useDragTrashZone } from '../useDragTrash';
import { useLongPressDrag } from '../useLongPressDrag';

function zoneAt(rect: { left: number; top: number; right: number; bottom: number }) {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ ...rect, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
  return element;
}

function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0 });
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  return event as PointerEvent;
}

let scope: EffectScope;
beforeEach(() => (scope = effectScope()));
afterEach(() => scope.stop());

describe('dragTrash', () => {
  it('над корзиной — over, отпустили — удаление', () => {
    scope.run(() => useDragTrashZone(ref(zoneAt({ left: 0, top: 500, right: 400, bottom: 600 }))));
    dragTrash.begin();
    expect(dragTrash.state.active).toBe(true);
    expect(dragTrash.move(100, 100)).toBe(false);
    expect(dragTrash.move(100, 550)).toBe(true);
    expect(dragTrash.end()).toBe(true);
    expect(dragTrash.state.active).toBe(false);
  });

  it('перенос мышью в корзину: onEnd без броска, затем onTrash', () => {
    const onEnd = vi.fn();
    const onTrash = vi.fn();
    const drag = scope.run(() => {
      useDragTrashZone(ref(zoneAt({ left: 0, top: 500, right: 400, bottom: 600 })));
      return useLongPressDrag<string>({ onStart: vi.fn(), onMove: vi.fn(), onEnd, onTrash });
    })!;

    drag.start(pointer('pointerdown', 100, 100), 'distance');
    window.dispatchEvent(pointer('pointermove', 100, 200));
    expect(dragTrash.state.active).toBe(true);
    window.dispatchEvent(pointer('pointermove', 100, 560));
    window.dispatchEvent(pointer('pointerup', 100, 560));

    expect(onEnd).toHaveBeenCalledWith('distance', false);
    expect(onTrash).toHaveBeenCalledWith('distance');
    expect(dragTrash.state.active).toBe(false);
  });

  it('отпустили мимо корзины — обычный бросок', () => {
    const onEnd = vi.fn();
    const onTrash = vi.fn();
    const drag = scope.run(() => {
      useDragTrashZone(ref(zoneAt({ left: 0, top: 500, right: 400, bottom: 600 })));
      return useLongPressDrag<string>({ onStart: vi.fn(), onMove: vi.fn(), onEnd, onTrash });
    })!;

    drag.start(pointer('pointerdown', 100, 100), 'time');
    window.dispatchEvent(pointer('pointermove', 100, 300));
    window.dispatchEvent(pointer('pointerup', 100, 300));

    expect(onEnd).toHaveBeenCalledWith('time', true);
    expect(onTrash).not.toHaveBeenCalled();
  });
});
