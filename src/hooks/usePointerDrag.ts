import { onScopeDispose } from 'vue';

type PointerDragHandlers = {
  /** Вернуть false, чтобы не начинать перетаскивание. */
  onStart?: (event: PointerEvent) => boolean | void;
  /** Смещение указателя в пикселях от точки начала. */
  onMove: (dx: number, dy: number) => void;
  onEnd?: (moved: boolean) => void;
};

/** Порог в пикселях, после которого касание считается перетаскиванием. */
const DRAG_THRESHOLD = 3;

/**
 * Перетаскивание мышью и пальцем через Pointer Events с захватом указателя.
 */
export function usePointerDrag({ onStart, onMove, onEnd }: PointerDragHandlers) {
  let cleanup: (() => void) | null = null;

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || onStart?.(event) === false) return;

    const target = event.currentTarget as HTMLElement;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;

    target.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      moved = true;
      onMove(dx, dy);
    };

    const handleUp = () => {
      cleanup?.();
      onEnd?.(moved);
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleUp);

    cleanup = () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleUp);
      cleanup = null;
    };
  }

  onScopeDispose(() => cleanup?.());

  return { handlePointerDown };
}
