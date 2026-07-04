// Shared deep-link highlight for admin tabs that link to each other by hash
// (/admin/policy#<key> ↔ /admin/config#<key>). Highlights and scrolls to the row
// whose element id equals the hash key, then fades the highlight out after a moment.
//
// Driven from the route hash rather than the CSS :target pseudo-class: the app runs
// vue-router in history mode, so an in-app navigation is a history.pushState that
// browsers do NOT re-evaluate :target for.
//
// A component using this mixin must:
//   - override `highlightableKeys()` to return the set of hash keys that map to a
//     highlightable element (element id === key), and
//   - bind the highlight class off `highlightedKey` (e.g. :class="{ 'x--highlight':
//     highlightedKey === key }").
// Rows that arrive asynchronously (apollo) should call `applyHashHighlight()` again
// once populated — the mixin already handles the initial mount and later hash changes.
//
// This is deliberately separate from mixins/scrollToAnchor.js (comment permalinks):
// that one only scrolls and has unrelated consumers, so it is not coupled to this.

// How long a deep-link highlight stays before it fades out. The fade itself is a CSS
// transition on the row; clearing the key drops the class and animates it.
export const HIGHLIGHT_DURATION_MS = 2500

export default {
  data() {
    return {
      // The key deep-linked to via the route hash, used to highlight and scroll to its
      // row. null when the hash is empty or does not match a highlightable key.
      highlightedKey: null,
    }
  },
  methods: {
    // The hash keys that have a highlightable element (id === key). Overridden per page.
    highlightableKeys() {
      return []
    },
    // Highlight and scroll to the row deep-linked from the route hash. A bare "#" or a
    // key with no matching element clears the highlight. No-ops (clears) until the key is
    // highlightable, so async pages re-invoke this once their rows exist.
    applyHashHighlight() {
      clearTimeout(this.highlightTimer)
      const key = (this.$route?.hash || '').replace(/^#/, '')
      const known = !!key && [...this.highlightableKeys()].includes(key)
      this.highlightedKey = known ? key : null
      if (!this.highlightedKey) return
      this.$nextTick(() => {
        document.getElementById(this.highlightedKey)?.scrollIntoView({ block: 'center' })
      })
      // Fade the highlight out after a moment: it draws the eye on arrival without
      // sticking permanently.
      this.highlightTimer = setTimeout(() => {
        this.highlightedKey = null
      }, HIGHLIGHT_DURATION_MS)
    },
  },
  watch: {
    // Deep-linked to while already on this page (or the hash changed) → re-evaluate which
    // row to highlight without a remount.
    '$route.hash'() {
      this.applyHashHighlight()
    },
  },
  mounted() {
    // Covers the case where the rows are already present at mount (static rows, or a
    // cached apollo result). Async pages re-run this from their own data watcher.
    this.applyHashHighlight()
  },
  beforeDestroy() {
    clearTimeout(this.highlightTimer)
  },
}
