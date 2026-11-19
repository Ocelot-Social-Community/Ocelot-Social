import { Extension, Plugin, PluginKey } from 'tiptap'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const LINK_SELECTION_CLASS = 'link-selection'

const key = new PluginKey('link_selection')

// While the link input has the focus, the editor has not, and the browser stops painting the
// selection: nobody could see which text the link is for. So the text that was selected when the
// input opened is marked as a decoration until the input closes. The editor tells the range by a
// meta transaction (`{ from, to }` to mark, `null` to clear); it moves along with the text.
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
            const to = tr.mapping.map(value.to, -1)
            return from < to ? { from, to } : null
          },
        },
        props: {
          decorations: (state) => {
            const range = key.getState(state)
            if (!range) return null
            return DecorationSet.create(state.doc, [
              Decoration.inline(range.from, range.to, { class: LINK_SELECTION_CLASS }),
            ])
          },
        },
      }),
    ]
  }
}
