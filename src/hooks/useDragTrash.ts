import { onScopeDispose, readonly, reactive, watch, type Ref } from 'vue';

/**
 * Корзина для удаления перетаскиванием: пока элемент карточки тащат, в редакторе
 * всегда в одном месте (вместо нижней панели инструментов) появляется корзина;
 * отпустили над ней — элемент удаляется. Перетаскивания сообщают о себе через
 * `dragTrash`, сама корзина (`EditorTrashZone`) регистрирует свою область.
 */
const state = reactive({
  /** Сейчас что-то тащат — корзина видна. */
  active: false,
  /** Палец (указатель) над корзиной. */
  over: false,
});

let zone: HTMLElement | null = null;

function isInsideZone(x: number, y: number): boolean {
  const rect = zone?.getBoundingClientRect();
  return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

export const dragTrash = {
  state: readonly(state),

  /** Перетаскивание началось — показать корзину. */
  begin() {
    state.active = true;
    state.over = false;
  },

  /** Указатель сдвинулся; возвращает, над корзиной ли он. */
  move(x: number, y: number): boolean {
    if (!state.active) return false;
    state.over = isInsideZone(x, y);
    return state.over;
  },

  /** Перетаскивание закончилось; true — отпустили над корзиной. */
  end(): boolean {
    const dropped = state.active && state.over;
    state.active = false;
    state.over = false;
    return dropped;
  },
};

/** Регистрирует элемент корзины (один на редактор). */
export function useDragTrashZone(element: Ref<HTMLElement | null>) {
  watch(
    element,
    (value) => {
      zone = value;
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    zone = null;
    state.active = false;
    state.over = false;
  });
}
