import { onScopeDispose } from 'vue';

type LongPressDragOptions<T> = {
  /** Сколько держать палец, прежде чем начнётся перетаскивание. */
  longPressMs?: number;
  onStart: (id: T) => void;
  /** Смещение указателя в пикселях от точки нажатия. */
  onMove: (id: T, dx: number, dy: number) => void;
  /** dropped = false, если перетаскивание отменили (например, pointercancel). */
  onEnd: (id: T, dropped: boolean) => void;
};

/** Сдвиг пальца до долгого нажатия — это прокрутка, а не перетаскивание. */
const SCROLL_TOLERANCE = 8;
/** Сдвиг мыши, после которого начинается перетаскивание. */
const MOUSE_THRESHOLD = 4;

type DragSession<T> = {
  id: T;
  startX: number;
  startY: number;
  immediate: boolean;
  active: boolean;
  timer: number | undefined;
};

/**
 * Перетаскивание с учётом касаний: мышью — сразу, пальцем — после долгого нажатия,
 * чтобы обычный свайп по-прежнему прокручивал страницу.
 */
export function useLongPressDrag<T>({
  longPressMs = 220,
  onStart,
  onMove,
  onEnd,
}: LongPressDragOptions<T>) {
  let session: DragSession<T> | null = null;
  let suppressNextClick = false;

  function activate() {
    if (!session || session.active) return;

    session.active = true;
    navigator.vibrate?.(8);
    onStart(session.id);
  }

  // Пока идёт перетаскивание пальцем, не даём странице прокручиваться.
  function preventTouchScroll(event: TouchEvent) {
    if (session?.active) event.preventDefault();
  }

  function handleMove(event: PointerEvent) {
    if (!session) return;

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    const distance = Math.hypot(dx, dy);

    if (!session.active) {
      if (session.immediate && distance >= MOUSE_THRESHOLD) {
        activate();
      } else if (!session.immediate && distance > SCROLL_TOLERANCE) {
        // Палец поехал до долгого нажатия — это прокрутка.
        finish(false);
        return;
      } else {
        return;
      }
    }

    onMove(session.id, dx, dy);
  }

  function handleUp() {
    finish(true);
  }

  function handleCancel() {
    finish(false);
  }

  function removeListeners() {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleCancel);
    document.removeEventListener('touchmove', preventTouchScroll);
  }

  function finish(dropped: boolean) {
    if (!session) return;

    const { id, active, timer } = session;
    window.clearTimeout(timer);
    removeListeners();
    session = null;

    if (active) {
      // Отпускание после перетаскивания не должно считаться тапом по элементу.
      suppressNextClick = true;
      window.setTimeout(() => (suppressNextClick = false), 0);
      onEnd(id, dropped);
    }
  }

  /**
   * @param immediate начинать без долгого нажатия (мышь или уже выделенный элемент).
   */
  function start(event: PointerEvent, id: T, immediate = event.pointerType === 'mouse') {
    if (event.button !== 0 || session) return;

    session = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      immediate,
      active: false,
      timer: undefined,
    };

    if (!immediate) {
      session.timer = window.setTimeout(activate, longPressMs);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
  }

  function isClickSuppressed(): boolean {
    return suppressNextClick;
  }

  onScopeDispose(() => finish(false));

  return { start, isClickSuppressed };
}
