import { isVue2 } from 'vue-demi'

/**
 * Element data for `h()` on a plain element, written the Vue 3 way: everything flat. Vue 2
 * takes HTML attributes under `attrs` and silently drops them at the top level, so there the
 * attributes are moved — `class`, `ref`, `key` and the `on` listeners stay where they are.
 */
export function elementData(data: Record<string, unknown>): Record<string, unknown> {
  /* v8 ignore start -- Vue 2 branch */
  if (isVue2) {
    const { class: className, ref: elementRef, key, on, ...attributes } = data
    return { class: className, ref: elementRef, key, on, attrs: attributes }
  }
  /* v8 ignore stop */
  return data
}
