<template>
  <div class="editor">
    <menu-bar :editor="editor" :toggleLinkInput="toggleLinkInput" />
    <editor-content ref="editor" :editor="editor" class="ds-input editor-content" />
    <context-menu ref="contextMenu" />
    <suggestion-list
      ref="suggestions"
      :suggestion-type="suggestionType"
      :filtered-items="filteredItems"
      :loading="suggestionsLoading"
      :navigated-item-index="navigatedItemIndex"
      :query="query"
      :select-item="selectItem"
    />
    <div v-show="isLinkInputActive" ref="linkInput">
      <ocelot-input
        id="linkInputId"
        v-model="linkUrl"
        class="editor-menu-link-input"
        placeholder="https://"
        @blur.native.capture="toggleLinkInput()"
        @keydown.native.esc.prevent="toggleLinkInput()"
        @keydown.native.enter.prevent="enterLink()"
      />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from 'tiptap'
import { History } from 'tiptap-extensions'
import linkify from 'linkify-it'
import { replace, build } from 'xregexp/xregexp-all.js'

import * as key from '../../constants/keycodes'
import { HASHTAG, MENTION } from '../../constants/editor'
import defaultExtensions from './defaultExtensions'
import EventHandler from './plugins/eventHandler'
import Hashtag from './nodes/Hashtag'
import Mention from './nodes/Mention'
import MenuBar from './MenuBar'
import ContextMenu from './ContextMenu'
import SuggestionList from './SuggestionList'
import { matchesMentionQuery } from './mentionSuggestions'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

// How long typing has to pause before the mention suggestions are asked for.
const MENTION_DEBOUNCE_MS = 150

export default {
  components: {
    ContextMenu,
    EditorContent,
    MenuBar,
    SuggestionList,
    OcelotInput,
  },
  props: {
    // Loads the users to offer for an @-mention: `async (query) => [{ id, slug, name, avatar,
    // relation }]`, already filtered and ordered — see ./mentionSuggestions.js. If 'null', than the
    // Mention extention is not assigned.
    mentionSuggestions: { type: Function, default: null },
    hashtags: { type: Array, default: () => null }, // If 'null', than the Hashtag extention is not assigned.
    value: { type: String, default: '' },
    doc: { type: Object, default: () => {} },
    // Id of an element (e.g. the visible "Content"/"Description" label
    // above this editor) that names the ProseMirror-generated
    // contenteditable as its accessible name — the label itself has no
    // `for` target to attach to, since ProseMirror's DOM isn't rendered by
    // this component (see mounted() below).
    ariaLabelledby: { type: String, default: null },
  },
  data() {
    return {
      lastValueHash: null,
      editor: null,
      isLinkInputActive: false,
      linkUrl: null,
      suggestionType: '',
      query: null,
      suggestionRange: null,
      filteredItems: [],
      suggestionsLoading: false,
      navigatedItemIndex: 0,
      insertMentionOrHashtag: () => {},
      observer: null,
    }
  },
  computed: {
    placeholder() {
      return this.$t('editor.placeholder')
    },
    optionalExtensions() {
      const extensions = []
      // Don't change the following line. The functionallity is in danger!
      if (this.mentionSuggestions) {
        extensions.push(
          new Mention({
            // The plugin gets no items of its own: the list is loaded from the backend per typed
            // query, in loadMentionSuggestions. Doing that inside `onFilter` (the plugin does await
            // it) would hand the ordering of open/change/exit to the network — a slow answer to
            // the opening "@" would re-open a list that was closed long ago.
            items: () => [],
            onEnter: (props) => this.openSuggestionList(props, MENTION),
            onChange: this.updateSuggestionList,
            onExit: this.closeSuggestionList,
            onKeyDown: this.navigateSuggestionList,
            onFilter: () => [],
          }),
        )
      }
      // Don't change the following line. The functionallity is in danger!
      if (this.hashtags) {
        extensions.push(
          new Hashtag({
            items: () => {
              return this.hashtags
            },
            onEnter: (props) => this.openSuggestionList(props, HASHTAG),
            onChange: this.updateSuggestionList,
            onExit: this.closeSuggestionList,
            onKeyDown: this.navigateSuggestionList,
            onFilter: this.filterSuggestionList,
          }),
        )
      }
      return extensions
    },
  },
  watch: {
    placeholder: {
      immediate: true,
      handler: function (val) {
        if (!val || !this.editor) {
          return
        }
        this.editor.extensions.options.placeholder.emptyNodeText = val
      },
    },
  },
  mounted() {
    this._throttleTimer = undefined
    this._mentionTimer = undefined
    this._mentionCache = new Map()
    this.editor = new Editor({
      content: this.value || '',
      doc: this.doc,
      editorProps: this.ariaLabelledby
        ? { attributes: { 'aria-labelledby': this.ariaLabelledby } }
        : {},
      extensions: [
        // Hashtags must come first, see
        // https://github.com/scrumpy/tiptap/issues/421#issuecomment-523037460
        ...this.optionalExtensions,
        ...defaultExtensions(this),
        new EventHandler(),
        new History(),
      ],
      onUpdate: (e) => {
        clearTimeout(this._throttleTimer)
        this._throttleTimer = setTimeout(() => {
          this._throttleTimer = undefined
          this.onUpdate(e)
        }, 300)
      },
      onFocus: () => {
        // Back in the editor with the cursor still in the "@…"/"#…" it left: the list returns.
        // (A click elsewhere in the text moves the cursor out, and the plugin closes the list.)
        if (this.suggestionRange) {
          this.$refs.contextMenu.resume()
        }
      },
      onBlur: () => {
        // The list belongs to what is being typed; without the focus it would hang over whatever
        // the user turned to. Suspended, not closed — see onFocus.
        if (this.suggestionRange) {
          this.$refs.contextMenu.suspend()
        }
        // Flush any pending throttled update immediately so formData is
        // in sync before the form validates on submit.
        if (this._throttleTimer !== undefined) {
          clearTimeout(this._throttleTimer)
          this._throttleTimer = undefined
          this.$emit('input', this.editor.getHTML())
        }
      },
    })
  },
  beforeDestroy() {
    clearTimeout(this._throttleTimer)
    clearTimeout(this._mentionTimer)
    this.editor.destroy()
  },
  methods: {
    // Anchors the suggestion popup and shows it.
    //
    // The anchor is the decoration span tiptap's Suggestions plugin wraps around the typed "@"/"#".
    // Two things rule out handing that element (or the plugin's own `virtualNode`, which closes over
    // one) to tippy directly:
    //
    // - prosemirror-view REPLACES the span when it redraws (measured: right after the list opens).
    //   The popup is created once and keeps its first reference (see displayContextMenu), so it
    //   would go on measuring an element that is no longer in the document — a 0/0 rect, which put
    //   the list in the top left corner of the page.
    // - On the keystroke that OPENS the list the span is not in the DOM yet: since prosemirror-view
    //   1.42 the plugin's `update()` runs before the decoration is written, so its `virtualNode` is
    //   null. Handing that null to `tippy()` is what produced "this.menu.show is not a function":
    //   for anything that is not an element tippy returns a list of instances — an empty one.
    //
    // So the popup gets a virtual reference that looks the CURRENT span up on every measurement, and
    // when the span is not there yet we wait one tick for prosemirror to write it.
    suggestionAnchor(view) {
      let rect = null
      return {
        getBoundingClientRect() {
          const decoration = view.dom.querySelector('[data-decoration-id]')
          // Between two redraws there may be no span for a moment: stay where we were.
          if (decoration) rect = decoration.getBoundingClientRect()
          return rect
        },
        // An inline span has no client box; popper falls back to the rect's size for 0.
        clientWidth: 0,
        clientHeight: 0,
      }
    },
    showSuggestionMenu(view) {
      if (!view) return
      const hasDecoration = () => !!view.dom.querySelector('[data-decoration-id]')
      const display = () =>
        this.$refs.contextMenu.displayContextMenu(
          this.suggestionAnchor(view),
          this.$refs.suggestions.$el,
        )
      if (hasDecoration()) {
        display()
        return
      }
      this.$nextTick(() => {
        // `suggestionRange` is cleared by closeSuggestionList: without this check a list that was
        // dismissed within the same tick (Escape, or a keystroke that ends the match) would still
        // pop open here.
        if (!this.suggestionRange) return
        if (hasDecoration()) {
          display()
        }
      })
    },
    // tiptap's Suggestions plugin announces a suggestion once more right after one was inserted:
    // the inserted mention/hashtag carries its own "@…"/"#…" text, the plugin takes that for a
    // suggestion that has moved, and hands over the range of the text that was just replaced
    // (measured: typed "@bo", picked a user — onEnter again with query "bo", cursor far behind the
    // range). Nothing was ever shown for it, because no decoration follows; but it must not start
    // a request for suggestions either. A suggestion being typed has the cursor inside its range.
    isBeingTyped({ range, view }) {
      if (!view) return true
      const { from } = view.state.selection
      return from >= range.from && from <= range.to
    },
    openSuggestionList({ items, query, range, command, view }, suggestionType) {
      if (!this.isBeingTyped({ range, view })) return
      // Every list starts from scratch — nothing of a previous one carries over.
      clearTimeout(this._mentionTimer)
      this._mentionCache.clear()
      this.filteredItems = []
      this.suggestionsLoading = false
      this.suggestionType = suggestionType
      this.query = this.sanitizeQuery(query)
      this.suggestionRange = range
      this.setSuggestionItems(items)
      this.showSuggestionMenu(view)
      this.insertMentionOrHashtag = command
    },
    updateSuggestionList({ items, query, range, view }) {
      // No list was opened for it — see isBeingTyped.
      if (!this.suggestionType) return
      this.query = this.sanitizeQuery(query)
      this.suggestionRange = range
      this.navigatedItemIndex = 0
      this.setSuggestionItems(items)
      this.showSuggestionMenu(view)
    },
    closeSuggestionList() {
      clearTimeout(this._mentionTimer)
      // Follows, comments and mentions change; the next list starts from fresh answers.
      this._mentionCache.clear()
      this.suggestionsLoading = false
      this.suggestionType = ''
      this.query = null
      this.filteredItems = []
      this.suggestionRange = null
      this.navigatedItemIndex = 0
      this.$refs.contextMenu.hideContextMenu()
    },
    // Hashtags arrive filtered from the plugin; mentions are loaded.
    setSuggestionItems(items) {
      if (this.suggestionType === MENTION) {
        this.loadMentionSuggestions()
      } else {
        this.filteredItems = items
      }
    },
    // Asks the backend for the users matching what has been typed after the "@".
    loadMentionSuggestions() {
      const query = this.query || ''
      clearTimeout(this._mentionTimer)

      const cached = this._mentionCache.get(query)
      if (cached) {
        this.filteredItems = cached
        this.suggestionsLoading = false
        return
      }

      // Until the answer is in, keep those on screen that still fit — so the list neither
      // flickers empty on every keystroke nor offers (to Enter!) someone who no longer matches.
      const isOpening = !this.filteredItems.length && !this.suggestionsLoading
      this.filteredItems = this.filteredItems.filter((item) => matchesMentionQuery(item, query))
      this.suggestionsLoading = true

      const load = async () => {
        let items = null
        try {
          items = await this.mentionSuggestions(query)
          this._mentionCache.set(query, items)
        } catch {
          // The list is a convenience: without an answer it shows "no users found".
        }
        // Answers can overtake each other, and the list may have been closed in the meantime.
        if (this.suggestionType !== MENTION || (this.query || '') !== query) return
        this.filteredItems = items || []
        this.navigatedItemIndex = 0
        this.suggestionsLoading = false
      }
      // The opening "@" is not typing yet — nothing to wait for.
      if (isOpening) {
        load()
      } else {
        this._mentionTimer = setTimeout(load, MENTION_DEBOUNCE_MS)
      }
    },
    navigateSuggestionList({ event }) {
      const item = this.filteredItems[this.navigatedItemIndex]

      switch (event.keyCode) {
        case key.ARROW_UP:
          this.navigatedItemIndex =
            (this.navigatedItemIndex + this.filteredItems.length - 1) % this.filteredItems.length
          return true

        case key.ARROW_DOWN:
          this.navigatedItemIndex = (this.navigatedItemIndex + 1) % this.filteredItems.length
          return true

        case key.RETURN:
          if (item) {
            this.selectItem(item)
          }
          return true

        case key.SPACE:
          if (this.suggestionType === HASHTAG && this.query !== '') {
            this.selectItem({ id: this.query })
          }
          if (this.suggestionType === MENTION && item) {
            this.selectItem(item)
          }
          return true

        default:
          return false
      }
    },
    filterSuggestionList(items, query) {
      query = this.sanitizeQuery(query)
      if (!query) {
        return items.slice(0, 15)
      }

      const filteredList = items.filter((item) => {
        const itemString = item.slug || item.id
        return itemString.toLowerCase().startsWith(query.toLowerCase())
      })
      const sortedList = filteredList.sort((itemA, itemB) => {
        const aString = itemA.slug || itemA.id
        const bString = itemB.slug || itemB.id
        return aString.length - bString.length
      })
      return sortedList.slice(0, 15)
    },
    sanitizeQuery(query) {
      if (this.suggestionType === HASHTAG) {
        // remove all non unicode letters and non digits
        const regexMatchAllNonUnicodeLettersOrDigits = build('[^\\pL0-9]')
        query = replace(query, regexMatchAllNonUnicodeLettersOrDigits, '', 'all')
        // if the query is only made of digits, make it empty
        return query.replace(/[0-9]/gm, '') === '' ? '' : query
      }
      return query
    },
    // we have to replace our suggestion text with a mention
    // so it's important to pass also the position of your suggestion text
    selectItem(item) {
      const typeAttrs = {
        mention: {
          id: item.id,
          label: item.slug,
        },
        hashtag: {
          id: item.id,
          label: item.id,
        },
      }
      this.insertMentionOrHashtag({
        range: this.suggestionRange,
        attrs: typeAttrs[this.suggestionType],
      })
      this.editor.focus()
    },
    onUpdate(e) {
      const content = e.getHTML()
      this.$emit('input', content)
    },
    insertReply(message) {
      this.editor.commands.mention({ id: message.id, label: message.slug })
    },
    enterLink() {
      this.setLinkUrl(this.linkUrl)
      this.linkUrl = null
    },
    toggleLinkInput(attrs, element) {
      if (this.$refs.contextMenu.menu) {
        this.$refs.contextMenu.hideContextMenu()
        this.isLinkInputActive = false
        this.editor.focus()
      } else if (attrs && element) {
        this.linkUrl = attrs.href
        this.isLinkInputActive = true
        this.$nextTick(() => {
          this.$refs.contextMenu.displayContextMenu(element, this.$refs.linkInput, 'link')
        })
      } else {
        this.isLinkInputActive = false
        this.editor.focus()
      }
    },
    setLinkUrl(url) {
      const normalizedLinks = url ? linkify().match(url) : null
      const command = this.editor.commands.link
      if (normalizedLinks) {
        // add valid link
        command({
          href: normalizedLinks.pop().url,
        })
        this.toggleLinkInput()
        this.editor.focus()
      } else {
        // remove link
        command({ href: null })
      }
    },
    clear() {
      this.editor.clearContent(true)
    },
  },
}
</script>

<style>
.editor p.is-empty:first-child::before {
  content: attr(data-empty-text);
  float: left;
  color: var(--text-color-disabled);
  padding-left: var(--space-xx-small);
  pointer-events: none;
  height: 0;
}

.menubar__button {
  font-weight: normal;
}

li > p {
  margin-top: var(--space-xx-small);
  margin-bottom: var(--space-xx-small);
}

.editor {
  display: flex;
  flex-direction: column;

  .hashtag {
    color: var(--color-primary);
  }
  .hashtag-suggestion {
    color: var(--color-primary);
  }
  .mention-suggestion {
    color: var(--color-primary);
  }
}

.editor-content {
  flex-grow: 1;
  margin-top: var(--space-small);
  height: auto;

  &:focus-within {
    border-color: var(--color-primary);
    background-color: var(--color-neutral-100);
  }
}

.ProseMirror {
  min-height: 100px;

  &:focus {
    outline: none;
  }

  p {
    margin: 0 0 var(--space-x-small);
  }

  ul {
    padding-left: var(--space-x-large);

    li {
      display: block;
      text-indent: calc(-1 * var(--space-large));

      p:first-child:before {
        content: '•';
        padding: var(--space-none) var(--space-x-small);
        margin-right: var(--space-x-small);
      }

      p:not(:first-child) {
        padding-left: var(--space-base);
      }
    }
  }

  ol {
    /*  https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Lists_and_Counters/Using_CSS_counters */
    counter-reset: item;
    padding-left: calc(var(--space-x-large) + 4px);

    li {
      display: block;
      text-indent: calc(-1 * var(--space-large) - 4px);

      p:first-child:before {
        content: counters(item, '.') '.';
        counter-increment: item;
        padding: var(--space-none) var(--space-x-small);
        margin-right: var(--space-x-small);
      }

      p:not(:first-child) {
        padding-left: var(--space-base);
      }
    }
  }
}
</style>
