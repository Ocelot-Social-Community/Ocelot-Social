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
import { matchesHashtagQuery, withNewHashtag } from './hashtagSuggestions'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

// How long typing has to pause before the suggestions are asked for.
const SUGGESTION_DEBOUNCE_MS = 150

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
    // The same for hashtags: `async (query) => [{ id, relation }]` — see ./hashtagSuggestions.js.
    // If 'null', than the Hashtag extention is not assigned.
    hashtagSuggestions: { type: Function, default: null },
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
            // query, in loadSuggestions. Doing that inside `onFilter` (the plugin does await
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
      if (this.hashtagSuggestions) {
        extensions.push(
          new Hashtag({
            // Loaded like the mentions, see above.
            items: () => [],
            onEnter: (props) => this.openSuggestionList(props, HASHTAG),
            onChange: this.updateSuggestionList,
            onExit: this.closeSuggestionList,
            onKeyDown: this.navigateSuggestionList,
            onFilter: () => [],
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
    this._suggestionTimer = undefined
    this._suggestionCache = new Map()
    // Counts the lists opened and closed, so an answer can tell whether the list it was asked for
    // is still the one on screen.
    this._suggestionSession = 0
    // Set while a list has been opened but not yet asked for — see loadSuggestions.
    this._suggestionOpening = false
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
    clearTimeout(this._suggestionTimer)
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
    //
    // The same text also matches with the cursor right BEHIND an existing mention/hashtag — after
    // "reply" inserted one, or after a click there. The plugin reads the node's closing boundary as
    // a "\0" and takes it into the query (measured: "jenny-rostock\0"), so nothing was found, and
    // the open list swallowed Space and Enter. Its range starts inside that node; a typed "@"/"#"
    // is plain text in the paragraph.
    isBeingTyped({ range, view }) {
      if (!view) return true
      const { from } = view.state.selection
      if (from < range.from || from > range.to) return false
      return !view.state.doc.resolve(range.from).parent.isInline
    },
    openSuggestionList({ query, range, command, view }, suggestionType) {
      if (!this.isBeingTyped({ range, view })) return
      // Every list starts from scratch — nothing of a previous one, of whichever kind, carries
      // over (the cache is keyed by the typed query alone).
      clearTimeout(this._suggestionTimer)
      this._suggestionCache.clear()
      this._suggestionSession += 1
      this.filteredItems = []
      this.suggestionsLoading = false
      this.suggestionType = suggestionType
      this.query = this.sanitizeQuery(query)
      this.suggestionRange = range
      this._suggestionOpening = true
      this.loadSuggestions()
      this.showSuggestionMenu(view)
      this.insertMentionOrHashtag = command
    },
    updateSuggestionList({ query, range, view }) {
      // No list was opened for it — see isBeingTyped.
      if (!this.suggestionType) return
      this.query = this.sanitizeQuery(query)
      this.suggestionRange = range
      this.navigatedItemIndex = 0
      this.loadSuggestions()
      this.showSuggestionMenu(view)
    },
    closeSuggestionList() {
      clearTimeout(this._suggestionTimer)
      this._suggestionSession += 1
      this._suggestionOpening = false
      // Follows, comments, mentions and tags change; the next list starts from fresh answers.
      this._suggestionCache.clear()
      this.suggestionsLoading = false
      this.suggestionType = ''
      this.query = null
      this.filteredItems = []
      this.suggestionRange = null
      this.navigatedItemIndex = 0
      this.$refs.contextMenu.hideContextMenu()
    },
    // Who answers for the kind of list that is open, the rule its answers follow, and what the
    // editor adds to an answer of its own accord.
    suggestionSource() {
      return this.suggestionType === MENTION
        ? {
            load: this.mentionSuggestions,
            matches: matchesMentionQuery,
            complete: (items) => items,
          }
        : { load: this.hashtagSuggestions, matches: matchesHashtagQuery, complete: withNewHashtag }
    },
    // Asks the backend for the users or hashtags matching what has been typed after the "@"/"#".
    loadSuggestions() {
      const type = this.suggestionType
      const query = this.query || ''
      const { load, matches, complete } = this.suggestionSource()
      clearTimeout(this._suggestionTimer)
      // Told by openSuggestionList, not read off the list being empty: it is just as empty after
      // an answer without matches or a failed request, and every keystroke that follows would
      // then skip the debounce.
      const isOpening = this._suggestionOpening
      this._suggestionOpening = false

      const cached = this._suggestionCache.get(query)
      if (cached) {
        this.filteredItems = cached
        this.suggestionsLoading = false
        return
      }

      // Until the answer is in, keep those on screen that still fit — so the list neither
      // flickers empty on every keystroke nor offers (to Enter!) an entry that no longer matches.
      this.filteredItems = this.filteredItems.filter((item) => matches(item, query))
      this.suggestionsLoading = true

      const session = this._suggestionSession
      const request = async () => {
        let items = null
        try {
          items = complete(await load(query), query)
        } catch {
          // The list is a convenience: without an answer it shows that nothing was found.
        }
        // The list this was asked for is gone — closed, or closed and opened again, possibly as
        // the other kind. Its answer belongs neither on screen nor in the cache of the list that
        // is open now (which is keyed by the typed query alone).
        if (session !== this._suggestionSession) return
        if (items) this._suggestionCache.set(query, items)
        // Answers can overtake each other within a list, too.
        if (this.suggestionType !== type || (this.query || '') !== query) return
        this.filteredItems = items || []
        this.navigatedItemIndex = 0
        this.suggestionsLoading = false
      }
      // The opening "@"/"#" is not typing yet — nothing to wait for.
      if (isOpening) {
        request()
      } else {
        this._suggestionTimer = setTimeout(request, SUGGESTION_DEBOUNCE_MS)
      }
    },
    navigateSuggestionList({ event }) {
      // The plugin passes the keys on whenever IT sees a suggestion, including the ones
      // isBeingTyped turned away — with no list open, Space and Enter must reach the text.
      if (!this.suggestionType) return false
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
    // Followed by a space, like a mention picked from the list (the plugin appends one there).
    // Without it the reply went on right behind the mention, and the Suggestions plugin took
    // what was typed for part of an "@…": it painted it green as if the link grew.
    insertReply(message) {
      this.editor.commands.mention({ id: message.id, label: message.slug })
      const { view } = this.editor
      view.dispatch(view.state.tr.insertText(' '))
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
