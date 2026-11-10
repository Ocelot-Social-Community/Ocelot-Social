import { Comment, Text, isVue2 } from 'vue-demi'

/** A node a slot renders, as far as telling an empty one apart goes. */
interface SlotNode {
  /** Vue 2: set on a comment node. */
  isComment?: boolean
  /** Vue 2: the element's tag, missing on a text node. */
  tag?: string
  /** Vue 2: a text node's text. */
  text?: string
  /** Vue 3: the node's type — `Comment` or `Text` for those nodes. */
  type?: unknown
  /** Vue 3: a text node's text. */
  children?: unknown
}

const isBlank = (text: unknown): boolean => typeof text === 'string' && text.trim() === ''

/**
 * Whether a node from a slot shows anything. A `v-if` that is false leaves a comment behind, and
 * the template's line breaks between two elements a blank text node. A slot holding only those
 * still has a length — a component asking "is this slot filled?" by its length would render the
 * wrapper (and its gap) around nothing.
 */
function isShown(node: SlotNode): boolean {
  /* v8 ignore start -- Vue 2 only: its nodes carry flags instead of types; tested in the webapp */
  if (isVue2) {
    return !node.isComment && !(node.tag === undefined && isBlank(node.text))
  }
  /* v8 ignore stop */
  return node.type !== Comment && !(node.type === Text && isBlank(node.children))
}

/** The nodes of a slot's output that show something; an empty array for an empty or absent slot. */
export function shownNodes<Node>(nodes: readonly Node[] | undefined | null): Node[] {
  return (nodes ?? []).filter((node) => isShown(node as SlotNode))
}
