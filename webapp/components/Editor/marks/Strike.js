import { Strike as TipTapStrike } from '@tiptap/extension-strike'

export default class Strike extends TipTapStrike {
  pasteRules() {
    return []
  }
}
