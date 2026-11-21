import { Extension, Plugin, PluginKey } from 'tiptap'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const LINK_SELECTION_CLASS = 'link-selection'
export const LINK_CURSOR_CLASS = 'link-cursor'

const key = new PluginKey('link_selection')

// While the link input has the focus, the editor has not, and the browser stops painting the
// selection: nobody could see which text the link is for. So the text that was selected when the
// input opened is marked as a decoration until the input closes. The editor tells the range by a
// meta transaction (`{ from, to }` to mark, `null` to clear); it moves along with the text. With
// nothing selected (`from` equals `to`) the cursor is marked instead, since the editor's own is
// not drawn while the input has the focus.
// A thin bar where the cursor is, styled in Editor.vue.
const cursorElement = () => {
  const element = document.createElement('span')
  element.className = LINK_CURSOR_CLASS
  return element
}

export const markLinkSelection = (view, range) => {
  view.dispatch(view.state.tr.setMeta(key, { range }))
}

export default class LinkSelection extends Extension {
  get name() {
    return 'link_selection'
  }

  get plugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(key)
            if (meta) return meta.range
            if (!value) return value
            const from = tr.mapping.map(value.from)
            if (value.from === value.to) return { from, to: from }
            const to = tr.mapping.map(value.to, -1)
            return from < to ? { from, to } : null
          },
        },
        props: {
          decorations: (state) => {
            const range = key.getState(state)
            if (!range) return null
            const decoration =
              range.from === range.to
                ? Decoration.widget(range.from, cursorElement, { key: LINK_CURSOR_CLASS })
                : Decoration.inline(range.from, range.to, { class: LINK_SELECTION_CLASS })
            return DecorationSet.create(state.doc, [decoration])
          },
        },
      }),
    ]
  }
}
