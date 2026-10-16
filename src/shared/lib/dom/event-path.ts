/**
 * Проверяет, прошло ли событие через элемент, подходящий под селектор.
 * Путь берётся из composedPath(): он фиксируется в момент события, поэтому проверка
 * работает, даже если обработчик раньше по пути уже убрал цель из DOM.
 */
export function eventPathMatches(event: Event, selector: string): boolean {
  return event
    .composedPath()
    .some((target) => target instanceof Element && target.matches(selector));
}
