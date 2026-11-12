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
              if (!node.isText) return true
              // A mention that comes back from the database is not parsed into a node again (see
              // nodes/Mention.js), but is a link with the text "@name": it was chosen once.
              if (node.marks.some((mark) => mark.type.name === 'link')) return true
              findUnfinished(node.text, types).forEach(({ from, to, type }) => {
                const start = pos + from
                const end = pos + to
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
              return true
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
