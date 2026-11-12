import { Extension, Plugin, PluginKey } from 'tiptap'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const UNFINISHED_CLASS = 'unfinished-suggestion'
export const UNFINISHED_TYPE_ATTRIBUTE = 'data-unfinished-type'

const key = new PluginKey('unfinished_suggestions')

// A mention or a hashtag is finished when it is a node of its own, chosen from the list: only
// then the backend notifies the user or connects the tag. What was typed and left as plain text
// ("@pet", "#hall") is not, so it gets a frame. A "@"/"#" counts at the start of a word only, so
// the "@" of an email address or the "#" of a link's fragment is left alone.
const PATTERNS = {
  mention: /(^|[\s([{"'„])(@[\p{L}\p{N}_.-]*[\p{L}\p{N}_-])/gu,
  hashtag: /(^|[\s([{"'„])(#[\p{L}\p{N}]+)/gu,
}

// Where the plain-text "@…"/"#…" are in a text node: offsets into the text, with the kind.
export const findUnfinished = (text, types) => {
  const found = []
  types.forEach((type) => {
    const pattern = new RegExp(PATTERNS[type].source, PATTERNS[type].flags)
    let match = pattern.exec(text)
    while (match) {
      const from = match.index + match[1].length
      found.push({ from, to: from + match[2].length, type })
      match = pattern.exec(text)
    }
  })
  return found
}

// Stands for what is no plain text: a node of its own (a chosen mention, a hard break) and text
// that is a link. A match cannot run over it, and it is no word boundary a "@" may follow.
const NOT_TEXT = '\uFFFC'

// The text of a textblock as ONE string, and where each of its characters is in the document.
// ProseMirror keeps differently marked text in separate nodes, so a word like "<b>@</b>pet" is
// in two of them and a pattern has to look across them. Text that is a link is a mention that
// comes back from the database (it is not parsed into a node again, see nodes/Mention.js): it
// was chosen once, so it is never unfinished.
export const textOfBlock = (block, blockPos) => {
  let text = ''
  const positions = []
  block.forEach((child, offset) => {
    const childPos = blockPos + 1 + offset
    if (child.isText) {
      const isLink = child.marks.some((mark) => mark.type.name === 'link')
      for (let i = 0; i < child.text.length; i++) {
        text += isLink ? NOT_TEXT : child.text[i]
        positions.push(childPos + i)
      }
    } else {
      text += NOT_TEXT
      positions.push(childPos)
    }
  })
  return { text, positions }
}

export default class UnfinishedSuggestions extends Extension {
  get name() {
    return 'unfinished_suggestions'
  }

  get defaultOptions() {
    return { types: [] }
  }

  get plugins() {
    // Which kinds the editor offers: without a list for one kind, nothing of it is "unfinished".
    const types = this.options.types
    return [
      new Plugin({
        key,
        state: {
          init: () => ({ focused: false }),
          // The focus is not part of the document, so the editor reports it by a meta
          // transaction, below, which also makes the decorations be drawn again.
          apply: (tr, value) => {
            const focused = tr.getMeta(key)
            return focused === undefined ? value : { focused }
          },
        },
        props: {
          decorations: (state) => {
            const { focused } = key.getState(state)
            const { selection } = state
            const decorations = []
            state.doc.descendants((node, pos) => {
              if (node.type.spec.code) return false
              if (!node.isTextblock) return true
              const { text, positions } = textOfBlock(node, pos)
              findUnfinished(text, types).forEach(({ from, to, type }) => {
                const start = positions[from]
                const end = positions[to - 1] + 1
                // Still being typed: the cursor is inside or at the end of it. Without the
                // focus nobody is typing, whatever the cursor was left at.
                const beingTyped =
                  focused && selection.empty && selection.from > start && selection.from <= end
                if (!beingTyped) {
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: UNFINISHED_CLASS,
                      // What the tooltip says, see Editor.vue.
                      [UNFINISHED_TYPE_ATTRIBUTE]: type,
                    }),
                  )
                }
              })
              return false
            })
            return DecorationSet.create(state.doc, decorations)
          },
          handleDOMEvents: {
            focus: (view) => {
              view.dispatch(view.state.tr.setMeta(key, true))
              return false
            },
            blur: (view) => {
              view.dispatch(view.state.tr.setMeta(key, false))
              return false
            },
          },
        },
      }),
    ]
  }
}
