import { onScopeDispose, shallowRef, watch } from 'vue';

/**
 * Следит за размерами элементов через ResizeObserver и вызывает `measure`.
 */
export function useResizeObserver(
  targets: () => (Element | null | undefined)[],
  measure: () => void,
) {
  const observer = shallowRef<ResizeObserver | null>(null);

  watch(
    targets,
    (elements) => {
      observer.value?.disconnect();
      observer.value = new ResizeObserver(() => measure());
      elements.forEach((element) => element && observer.value!.observe(element));
      measure();
    },
    { immediate: true, flush: 'post' },
  );

  onScopeDispose(() => observer.value?.disconnect());
}
