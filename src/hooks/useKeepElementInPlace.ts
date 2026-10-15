import type { Ref } from 'vue';
import { nextTick } from 'vue';

function getScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = getComputedStyle(parent);

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/**
 * Удерживает элемент на месте экрана, когда контент над ним меняет высоту:
 * после обновления DOM прокрутка компенсирует сдвиг.
 */
export function useKeepElementInPlace(element: Ref<HTMLElement | null | undefined>) {
  async function keepInPlace(update: () => void) {
    const target = element.value;
    const topBefore = target?.getBoundingClientRect().top;

    update();

    if (!target || topBefore === undefined) return;

    await nextTick();

    const shift = target.getBoundingClientRect().top - topBefore;
    if (Math.abs(shift) < 0.5) return;

    getScrollParent(target)?.scrollBy({ top: shift, behavior: 'instant' });
  }

  return { keepInPlace };
}
