import type { VNode } from 'vue-demi'

const modules = import.meta.glob<() => VNode>('./svgs/*.svg', {
  query: '?icon',
  eager: true,
  import: 'default',
})

function toName(path: string): string {
  const parts = path.replace('./svgs/', '').replace('.svg', '').split('-').filter(Boolean)
  return parts.map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1))).join('')
}

export const ocelotIcons: Record<string, () => VNode> = Object.fromEntries(
  Object.entries(modules).map(([path, icon]) => [toName(path), icon]),
)
