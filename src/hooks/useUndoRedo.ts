import { computed, nextTick, onScopeDispose, ref, watch, type Ref } from 'vue';

type UndoRedoOptions = {
  /** Сколько шагов назад можно вернуться. */
  limit?: number;
  /**
   * Изменения, идущие подряд быстрее этой паузы, — один шаг истории:
   * перетаскивание, движение слайдера или выбор цвета не засоряют историю.
   */
  debounceMs?: number;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * История изменений для отмены и повтора. Состояние должно быть сериализуемым в JSON.
 */
export function useUndoRedo<T>(
  source: Ref<T>,
  { limit = 10, debounceMs = 400 }: UndoRedoOptions = {},
) {
  let current = clone(source.value);
  const past = ref<T[]>([]) as Ref<T[]>;
  const future = ref<T[]>([]) as Ref<T[]>;
  let timer: number | undefined;
  /** Есть изменение, которое ещё не записано в историю. */
  const hasPending = ref(false);
  let isApplying = false;

  function commit() {
    timer = undefined;
    hasPending.value = false;
    const next = clone(source.value);
    if (JSON.stringify(next) === JSON.stringify(current)) return;

    past.value = [...past.value, current].slice(-limit);
    future.value = [];
    current = next;
  }

  /** Записывает отложенное изменение сразу (перед отменой или повтором). */
  function flush() {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      commit();
    }
  }

  function apply(state: T) {
    isApplying = true;
    current = state;
    source.value = clone(state);
    // Наблюдатель срабатывает до nextTick — изменение от отмены не попадёт в историю.
    nextTick(() => (isApplying = false));
  }

  watch(
    source,
    () => {
      if (isApplying) return;
      window.clearTimeout(timer);
      hasPending.value = true;
      timer = window.setTimeout(commit, debounceMs);
    },
    { deep: true },
  );

  function undo() {
    flush();
    const previous = past.value.at(-1);
    if (!previous) return;

    past.value = past.value.slice(0, -1);
    future.value = [current, ...future.value];
    apply(previous);
  }

  function redo() {
    flush();
    const [next, ...rest] = future.value;
    if (!next) return;

    future.value = rest;
    past.value = [...past.value, current].slice(-limit);
    apply(next);
  }

  onScopeDispose(() => window.clearTimeout(timer));

  return {
    undo,
    redo,
    // Пока изменение ждёт записи, отменить его уже можно.
    canUndo: computed(() => past.value.length > 0 || hasPending.value),
    canRedo: computed(() => future.value.length > 0),
  };
}
