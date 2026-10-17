import { onScopeDispose } from 'vue';
import { dragTrash } from '@/hooks/useDragTrash';

type LongPressDragOptions<T> = {
  /** Сколько держать палец, прежде чем начнётся перетаскивание. */
  longPressMs?: number;
  onStart: (id: T) => void;
  /** Смещение указателя в пикселях от точки нажатия. */
  onMove: (id: T, dx: number, dy: number) => void;
  /** dropped = false, если перетаскивание отменили (например, pointercancel). */
  onEnd: (id: T, dropped: boolean) => void;
  /**
   * Отпустили над корзиной (`dragTrash`): элемент удалить. С ним во время переноса
   * видна корзина; onEnd перед этим вызывается с dropped = false (вернуть всё как было).
   */
  onTrash?: (id: T) => void;
};

/**
 * Пальцы на экране — общий учёт для всех перетаскиваний (показатели, полосы):
 * пока пальцев больше одного, это жест двумя пальцами (поворот карты, щипок),
 * и новое перетаскивание не начинается. Слушаем на window в фазе захвата —
 * до обработчиков элементов.
 */
const pressedPointers = new Set<number>();

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (event) => {
      // Первый палец новой серии касаний — сбрасываем учёт (на случай потерянного pointerup).
      if (event.isPrimary) pressedPointers.clear();
      pressedPointers.add(event.pointerId);
    },
    true,
  );
  const release = (event: PointerEvent) => pressedPointers.delete(event.pointerId);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
}

/** Сдвиг пальца до долгого нажатия — это прокрутка, а не перетаскивание. */
const SCROLL_TOLERANCE = 8;
/** Сдвиг мыши, после которого начинается перетаскивание. */
const MOUSE_THRESHOLD = 4;

type DragSession<T> = {
  id: T;
  /** Палец (указатель), которым начали: движения других пальцев не учитываются. */
  pointerId: number;
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
  onTrash,
}: LongPressDragOptions<T>) {
  let session: DragSession<T> | null = null;
  let suppressNextClick = false;

  function activate() {
    if (!session || session.active) return;

    session.active = true;
    navigator.vibrate?.(8);
    if (onTrash) dragTrash.begin();
    onStart(session.id);
  }

  // Пока идёт перетаскивание пальцем, не даём странице прокручиваться.
  function preventTouchScroll(event: TouchEvent) {
    if (session?.active) event.preventDefault();
  }

  function handleMove(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return;

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

    // Сначала корзина: onMove уже знает, над ней ли палец (dragTrash.state.over).
    if (onTrash) dragTrash.move(event.clientX, event.clientY);
    onMove(session.id, dx, dy);
  }

  function handleUp(event: PointerEvent) {
    if (session && event.pointerId !== session.pointerId) return;
    finish(true);
  }

  function handleCancel(event: PointerEvent) {
    if (session && event.pointerId !== session.pointerId) return;
    finish(false);
  }

  /**
   * Второй палец — это жест двумя пальцами (поворот карты, щипок), а не перенос:
   * отменяем перенос, ничего не сохраняя.
   */
  function handleOtherPointerDown(event: PointerEvent) {
    if (session && event.pointerId !== session.pointerId) finish(false);
  }

  function removeListeners() {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleCancel);
    window.removeEventListener('pointerdown', handleOtherPointerDown, true);
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
      const trashed = onTrash ? dragTrash.end() && dropped : false;
      onEnd(id, dropped && !trashed);
      if (trashed) onTrash?.(id);
    }
  }

  /**
   * @param immediate начинать без долгого нажатия (мышь или уже выделенный элемент).
   */
  function start(event: PointerEvent, id: T, immediate = event.pointerType === 'mouse') {
    // Второй палец — не начало переноса, а жест двумя пальцами.
    if (event.button !== 0 || session || pressedPointers.size > 1) return;

    session = {
      id,
      pointerId: event.pointerId,
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
    window.addEventListener('pointerdown', handleOtherPointerDown, true);
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
  }

  function isClickSuppressed(): boolean {
    return suppressNextClick;
  }

  onScopeDispose(() => finish(false));

  return { start, isClickSuppressed };
}
