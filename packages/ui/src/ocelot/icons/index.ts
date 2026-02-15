import type { VNode } from 'vue-demi'

const modules = import.meta.glob<() => VNode>('./svgs/*.svg', {
  query: '?icon',
  eager: true,
  import: 'default',
})

function toName(path: string): string {
  return (
    'Icon' +
    path
      .replace('./svgs/', '')
      .replace('.svg', '')
      .split('-')
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join('')
  )
}

export const ocelotIcons: Record<string, () => VNode> = Object.fromEntries(
  Object.entries(modules).map(([path, icon]) => [toName(path), icon]),
)
