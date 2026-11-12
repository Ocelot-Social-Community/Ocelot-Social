<template>
  <editor-menu-bar :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
    <div ref="bar" class="editor-menubar" :class="{ 'is-stuck': isStuck }">
      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bold() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.bold')"
        @click="commands.bold"
      >
        <template #icon>
          <os-icon :icon="icons.bold" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.italic() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.italic')"
        @click="commands.italic"
      >
        <template #icon>
          <os-icon :icon="icons.italic" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.underline() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.underline')"
        @click="commands.underline"
      >
        <template #icon>
          <os-icon :icon="icons.underline" />
        </template>
      </os-button>

      <os-button
        ref="linkButton"
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.link() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.link')"
        @click="(event) => toggleLinkInput(getMarkAttrs('link'), event.target.closest('button'))"
      >
        <template #icon>
          <os-icon :icon="icons.link" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.paragraph() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.paragraph')"
        @click="commands.paragraph"
      >
        <template #icon>
          <os-icon :icon="icons.paragraph" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 3 }) ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.heading3')"
        @click="() => commands.heading({ level: 3 })"
      >
        H3
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.heading({ level: 4 }) ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.heading4')"
        @click="() => commands.heading({ level: 4 })"
      >
        H4
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.bullet_list() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.unorderedList')"
        @click="commands.bullet_list"
      >
        <template #icon>
          <os-icon :icon="icons.listUl" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.ordered_list() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.orderedList')"
        @click="commands.ordered_list"
      >
        <template #icon>
          <os-icon :icon="icons.listOl" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.blockquote() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.quote')"
        @click="commands.blockquote"
      >
        <template #icon>
          <os-icon :icon="icons.quoteRight" />
        </template>
      </os-button>

      <os-button
        size="sm"
        circle
        variant="primary"
        :appearance="isActive.horizontal_rule() ? 'outline' : 'ghost'"
        :aria-label="$t('editor.legend.ruler')"
        @click="commands.horizontal_rule"
      >
        <template #icon>
          <os-icon :icon="icons.minus" />
        </template>
      </os-button>

      <menu-legend class="legend-button" />
    </div>
  </editor-menu-bar>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { EditorMenuBar } from 'tiptap'
import MenuLegend from './MenuLegend.vue'

export default {
  components: {
    EditorMenuBar,
    MenuLegend,
    OsButton,
    OsIcon,
  },
  props: {
    editor: { type: Object, default: null },
    toggleLinkInput: { type: Function, required: true },
  },
  data() {
    return { isStuck: false }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    // The bar is the first thing in the editor, so it sits level with the editor's top until it
    // sticks; once it is lower than that, it is stuck. Asked of the DOM on every scroll, of any
    // scroll container (scroll does not bubble, hence capture), so no header height or scroll
    // container has to be assumed.
    this._checkStuck = () => {
      this._stuckFrame = null
      const bar = this.$refs.bar
      if (!bar || !bar.parentElement) return
      this.isStuck =
        bar.getBoundingClientRect().top - bar.parentElement.getBoundingClientRect().top > 0.5
    }
    this._onScroll = () => {
      if (!this._stuckFrame) this._stuckFrame = requestAnimationFrame(this._checkStuck)
    }
    window.addEventListener('scroll', this._onScroll, { capture: true, passive: true })
    window.addEventListener('resize', this._onScroll, { passive: true })
    this._checkStuck()
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this._onScroll, { capture: true })
    window.removeEventListener('resize', this._onScroll)
    if (this._stuckFrame) cancelAnimationFrame(this._stuckFrame)
  },
}
</script>

<style>
/* Stays in view below the page header while a long text scrolls past, so the link input, which
   opens at the link button, never opens out of sight (#4666). */
.editor-menubar {
  position: sticky;
  top: var(--header-height);
  z-index: var(--z-index-sticky);
  background-color: var(--background-color-base);
  /* The page header slides away and back in 0.3s (HeaderMenu) and --header-height follows it; the
     bar follows at the same pace, or it would jump. */
  transition:
    top 0.3s ease,
    box-shadow 0.15s ease;
}

/* Lifts off the text running past underneath only while it sticks; in its place it would only
   add noise above the text field. */
.editor-menubar.is-stuck {
  box-shadow: var(--box-shadow-sticky);
}

@media (prefers-reduced-motion: reduce) {
  .editor-menubar {
    transition: none;
  }
}

.legend-button {
  display: inline;
  position: relative;
}
</style>
