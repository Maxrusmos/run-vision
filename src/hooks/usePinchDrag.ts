import { onScopeDispose } from 'vue';

export type PinchDragChange = {
  /** Смещение середины между пальцами (или одного указателя) в пикселях. */
  dx: number;
  dy: number;
  /** Во сколько раз изменилось расстояние между пальцами; без щипка — 1. */
  scale: number;
};

type PinchDragHandlers = {
  /** Начало жеста или смена числа пальцев — точка отсчёта для onChange. */
  onStart: () => void;
  onChange: (change: PinchDragChange) => void;
  onEnd?: () => void;
};

type Point = { x: number; y: number };

function getMidpoint(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function getSpread(points: Point[]): number {
  const [a, b] = points;
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

/**
 * Перетаскивание одним пальцем (или мышью) и масштабирование щипком двумя пальцами.
 * Второй палец может коснуться экрана где угодно — жест уже начался на элементе.
 */
export function usePinchDrag({ onStart, onChange, onEnd }: PinchDragHandlers) {
  const pointers = new Map<number, Point>();
  let startMidpoint: Point = { x: 0, y: 0 };
  let startSpread = 0;

  function rebase() {
    const points = [...pointers.values()];
    startMidpoint = getMidpoint(points);
    startSpread = getSpread(points);
    onStart();
  }

  function handleMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    const midpoint = getMidpoint(points);
    const spread = getSpread(points);

    onChange({
      dx: midpoint.x - startMidpoint.x,
      dy: midpoint.y - startMidpoint.y,
      scale: startSpread > 0 && spread > 0 ? spread / startSpread : 1,
    });
  }

  function handleUp(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return;

    if (pointers.size) {
      rebase();
    } else {
      removeListeners();
      onEnd?.();
    }
  }

  // Второй палец за пределами элемента не должен нажимать то, что под ним.
  function handleExtraPointerDown(event: PointerEvent) {
    if (pointers.size >= 2 || event.pointerType !== 'touch') return;

    event.preventDefault();
    event.stopPropagation();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebase();
  }

  function preventTouchScroll(event: TouchEvent) {
    event.preventDefault();
  }

  function removeListeners() {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
    window.removeEventListener('pointerdown', handleExtraPointerDown, true);
    document.removeEventListener('touchmove', preventTouchScroll);
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;

    event.stopPropagation();

    if (pointers.size) {
      // Второй палец на самом элементе.
      handleExtraPointerDown(event);
      return;
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebase();

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    window.addEventListener('pointerdown', handleExtraPointerDown, true);
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
  }

  onScopeDispose(() => {
    pointers.clear();
    removeListeners();
  });

  return { handlePointerDown };
}
