/**
 * Автозаполнение (связка ключей iOS, Google) вставляет значение, иногда не сообщая о нём
 * событием input: подпись оставалась внутри поля поверх текста. Ловим его по анимации
 * из CSS (`rv-autofill`, `auth-view.css`), забираем значение в форму — подпись уходит наверх.
 * `fields` — имя поля ввода (`name`) → ключ формы.
 */
export function createAutofillHandler<K extends string>(
  form: Record<K, unknown>,
  fields: Record<string, K>,
) {
  return (event: AnimationEvent) => {
    if (!event.animationName.startsWith('rv-autofill')) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const field = fields[input.name];
    if (field && input.value && form[field] !== input.value) form[field] = input.value;
  };
}
