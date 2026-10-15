import { nextTick, watch, type Ref, type WatchSource } from 'vue';

type FlipOptions = {
  /** Атрибут, по которому сопоставляются элементы до и после обновления. */
  keyAttribute?: string;
  duration?: number;
  easing?: string;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * FLIP-анимация дочерних элементов контейнера при изменении `source`:
 * элементы плавно переезжают на новые места и меняют размер.
 * Размер анимируется через width/height (а не scale), чтобы текст не искажался.
 */
export function useFlipAnimation(
  container: Ref<HTMLElement | null | undefined>,
  source: WatchSource,
  {
    keyAttribute = 'data-flip-key',
    duration = 240,
    easing = 'cubic-bezier(0.2, 0, 0, 1)',
  }: FlipOptions = {},
) {
  function measure(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();

    container.value?.querySelectorAll<HTMLElement>(`[${keyAttribute}]`).forEach((element) => {
      rects.set(element.getAttribute(keyAttribute)!, element.getBoundingClientRect());
    });

    return rects;
  }

  function play(before: Map<string, DOMRect>) {
    container.value?.querySelectorAll<HTMLElement>(`[${keyAttribute}]`).forEach((element) => {
      const previous = before.get(element.getAttribute(keyAttribute)!);
      if (!previous) return;

      const next = element.getBoundingClientRect();
      const dx = previous.left - next.left;
      const dy = previous.top - next.top;
      const isResized =
        Math.abs(previous.width - next.width) > 0.5 ||
        Math.abs(previous.height - next.height) > 0.5;

      if (!isResized && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      element.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px)`,
            ...(isResized ? { width: `${previous.width}px`, height: `${previous.height}px` } : {}),
          },
          {
            transform: 'translate(0, 0)',
            ...(isResized ? { width: `${next.width}px`, height: `${next.height}px` } : {}),
          },
        ],
        { duration, easing },
      );
    });
  }

  // flush: 'pre' — замеряем до того, как Vue обновит DOM.
  watch(
    source,
    () => {
      if (prefersReducedMotion()) return;

      const before = measure();
      nextTick(() => play(before));
    },
    { flush: 'pre', deep: true },
  );
}
