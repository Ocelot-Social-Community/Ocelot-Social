// Recognises and formats the console output Vue 2.7 gives when the client cannot hydrate the
// server-rendered markup (vue/dist/vue.runtime.common.dev.js, `hydrate` and `patch`). Used by
// step_definitions/common/hydration_warnings.js.

// The one message every failed hydration ends in, through Vue's `warn()` — console.error.
const BAIL_OUT =
  '[Vue warn]: The client-side rendered virtual DOM tree is not matching server-rendered content'

// The console.warn calls that precede it and name the place: the parent element, then either both
// child lists or both innerHTML strings. Vue passes each label as the FIRST argument, followed by
// the values, so they are matched exactly.
const DETAIL_LABELS = [
  'Parent: ',
  'Mismatching childNodes vs. VNodes: ',
  'server innerHTML: ',
  'client innerHTML: ',
]

const MAX_TEXT = 60
const MAX_MESSAGE = 1000

const truncate = (text, max = MAX_TEXT) => (text.length > max ? `${text.slice(0, max)}…` : text)

export const isHydrationWarning = ([first]) =>
  typeof first === 'string' && (first.startsWith(BAIL_OUT) || DETAIL_LABELS.includes(first))

const describeValue = (value) => {
  if (typeof value === 'string') return value.trim()
  if (value === null || typeof value !== 'object') return String(value)
  // DOM nodes. The element's opening tag only: its outerHTML would carry the whole subtree.
  if (value.nodeType === 1) return value.outerHTML.slice(0, value.outerHTML.indexOf('>') + 1)
  if (value.nodeType === 3) return JSON.stringify(truncate(value.data))
  if (value.nodeType === 8) return `<!--${truncate(value.data)}-->`
  // VNodes. A component's tag reads `vue-component-<cid>-<Name>`.
  if ('tag' in value && 'elm' in value) {
    return value.tag ? `<${value.tag}>` : JSON.stringify(truncate(value.text ?? ''))
  }
  // NodeList or VNode array.
  if (typeof value.length === 'number') return `[${Array.from(value, describeValue).join(', ')}]`
  return Object.prototype.toString.call(value)
}

export const describeWarning = (args) => truncate(args.map(describeValue).join(' '), MAX_MESSAGE)

export const hydrationFailureMessage = (warnings) => {
  const byUrl = new Map()
  warnings.forEach(({ url, text }) => byUrl.set(url, [...(byUrl.get(url) ?? []), text]))
  const pages = [...byUrl].map(
    ([url, texts]) => `${url}\n${texts.map((text) => `  ${text}`).join('\n')}`,
  )
  return (
    'Vue could not hydrate the server-rendered markup (the client rendered something else, ' +
    'threw the server DOM away and rendered from scratch):\n\n' +
    pages.join('\n\n')
  )
}
