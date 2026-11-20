import { Selection, TextSelection } from 'prosemirror-state'

// The close button of an embed's preview, in the editor: the embed is taken out of the text and
// the address stays as a real link (text with the link mark, without the spaces around it that the
// preview's own link has), with the cursor behind it, ready to go on writing.
//
// There are two embed nodes of that name: a block one and an inline one (LegacyEmbed, the one the
// schema ends up with). A block gets a line of its own.
export default ({ view, node, pos }) => {
  const { state } = view
  const { schema } = state
  const url = node.attrs.dataEmbedUrl
  if (!url) {
    // An embed without an address (the schema accepts one) has nothing to leave as a link, and
    // ProseMirror has no empty text: it is just taken out.
    const tr = state.tr.delete(pos, pos + node.nodeSize)
    view.dispatch(
      tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)))),
    )
    view.focus()
    return
  }
  const link = schema.text(url, [schema.marks.link.create({ href: url })])
  const replacement = node.isBlock ? schema.nodes.paragraph.create(null, link) : link
  const tr = state.tr.replaceWith(pos, pos + node.nodeSize, replacement)
  const cursor = pos + url.length + (node.isBlock ? 1 : 0)
  view.dispatch(tr.setSelection(TextSelection.create(tr.doc, cursor)).setStoredMarks([]))
  view.focus()
}
