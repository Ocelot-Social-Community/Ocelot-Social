import { Extension } from 'tiptap'

// Ctrl+K (Cmd+K on a Mac) opens the link input, as the toolbar's link button does (#4666).
// tiptap's Link mark brings no key binding for this, so the editor passes in what to open.
export default class LinkShortcut extends Extension {
  get name() {
    return 'link_shortcut'
  }

  keys() {
    return {
      // Returning true marks the key as handled, so ProseMirror keeps the browser's own Ctrl+K
      // (e.g. focusing its search bar) from running too.
      'Mod-k': () => {
        this.options.onShortcut()
        return true
      },
    }
  }
}
