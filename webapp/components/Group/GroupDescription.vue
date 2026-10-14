<template>
  <os-card class="group-description">
    <!-- The collapsed preview is capped by CSS, not by a character count: an excerpt cut to
         N characters is a heading and a list here and a single paragraph there, so its
         rendered height varied wildly between groups. The cap is applied to the outer
         element; the inner one keeps its natural height and is what we measure against. -->
    <div
      ref="clamp"
      class="content hyphenate-text description-clamp"
      :style="clampStyle"
      data-test="description-clamp"
    >
      <!-- Both states go through the same tiptap viewer so links, hashtags and mentions
           render identically. ContentViewer builds its editor in data() and needs
           `document`, so before hydration we emit the backend-sanitized HTML as-is — same
           markup, SSR-safe, and the server response still carries the description for
           crawlers. -->
      <div ref="content">
        <content-viewer v-if="hydrated" :content="description" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else v-html="description" />
      </div>
    </div>
    <os-button
      v-if="overflows"
      class="collaps-button"
      variant="primary"
      appearance="ghost"
      size="sm"
      data-test="description-toggle"
      @click="collapsed = !collapsed"
    >
      {{ collapsed ? $t('comment.show.more') : $t('comment.show.less') }}
    </os-button>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { branding } from '@ocelot-social/branding'
import ContentViewer from '~/components/Editor/ContentViewer'
import { cleanCutHeight, contentAtoms } from '~/utils/cleanCut'

/**
 * A group's description, collapsed to a few lines with a toggle when it is longer.
 *
 * Its own component so that it measures from its OWN mount: it exists exactly when the
 * description is in the DOM. Measuring from the page's mount missed every group that
 * arrived later — the first visit by client-side navigation — and missed the moment tiptap
 * attaches its content, a tick after it renders (#10488).
 */
export default {
  name: 'GroupDescription',
  components: { ContentViewer, OsButton, OsCard },
  props: {
    /** Backend-sanitized HTML. */
    description: { type: String, default: '' },
  },
  data() {
    return {
      collapsed: true,
      // Whether the description is actually taller than the collapsed cap. Starts false so
      // the toggle is absent until measured — an always-visible button on a two-line
      // description is a dead end. Only a browser can answer this, so SSR renders none.
      overflows: false,
      // Whether this browser can tell us when the content changes size. Assumed until
      // mounted, so the server-rendered first paint is capped like the hydrated one.
      measurable: true,
      // Where the collapsed preview ends, in px: below the last line or image that fits whole
      // under the cap (#10487). Null until a browser has measured, and where no such line
      // exists — then the cap itself stands.
      cut: null,
      hydrated: false,
    }
  },
  computed: {
    // Inline rather than in a class, because this has to hold on the FIRST paint. The
    // page's scoped stylesheet is not necessarily there yet — under Nuxt's dev server it is
    // injected by JS after hydration — and until it arrives a class-based cap does nothing,
    // so the full description flashed up and then collapsed. An inline style ships inside
    // the server-rendered HTML and applies before any stylesheet.
    //
    // Only the line COUNT is ours; the line height itself comes from the design tokens,
    // with the token's own value as the fallback for the same first-paint reason.
    //
    // Not capped at all where the size cannot be watched: text cut off with no way to
    // expand it is worse than a long card.
    //
    // The clean cut goes into `height`, not over the cap: max-height keeps saying where the
    // cap is, which is what the next measurement compares against.
    clampStyle() {
      if (!this.collapsed || !this.measurable) return {}
      return {
        maxHeight: `calc(${branding.group.descriptionCollapsedLines} * var(--line-height-base, 1.3) * 1em)`,
        overflow: 'hidden',
        ...(this.cut === null ? {} : { height: `${this.cut}px` }),
      }
    },
  },
  watch: {
    // Edited in place by an owner, or the network's answer after the cached one. A new text
    // starts as a new preview, collapsed: measuring happens only while collapsed, so an
    // expanded reader would otherwise keep a "show less" on a text that now fits. The
    // observer sees the new height too; this keeps the toggle right without waiting for it.
    description() {
      this.collapsed = true
      this.$nextTick(this.measure)
    },
    collapsed(collapsed) {
      if (collapsed) this.$nextTick(this.measure)
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.hydrated = true
    })
    if (typeof ResizeObserver === 'undefined') {
      this.measurable = false
      return
    }
    this.measure()
    // The inner element is the one that grows: tiptap attaches its content a tick after it
    // renders, the pre-hydration HTML swaps for the tiptap render, images load, the column
    // narrows, the webfont replaces the fallback. One observer catches all of them.
    this._observer = new ResizeObserver(() => this.measure())
    this._observer.observe(this.$refs.content)
  },
  beforeDestroy() {
    this._observer?.disconnect()
    this._observer = null
  },
  methods: {
    measure() {
      // Only meaningful while collapsed: expanded, the outer element has no cap, so the
      // comparison would always say "fits" and pull the "show less" button out from under
      // the reader. The last collapsed measurement stays valid — the content cannot have
      // shrunk below the cap by being revealed.
      if (!this.collapsed) return
      const { clamp, content } = this.$refs
      if (!clamp || !content) return
      // The cap as the browser resolved it. Read off max-height rather than the element's
      // height, which is the cut once there is one. Where it does not resolve to pixels
      // (jsdom), the rendered height is the cap: nothing else shortens it before a cut.
      const resolved = parseFloat(getComputedStyle(clamp).maxHeight)
      const cap = Number.isFinite(resolved) ? resolved : clamp.clientHeight
      // 1px of slack: sub-pixel line heights otherwise report a permanent overflow and show
      // a toggle that expands to nothing.
      this.overflows = content.scrollHeight > cap + 1
      this.cut = this.overflows ? cleanCutHeight(contentAtoms(content), cap) : null
    },
  },
}
</script>

<style scoped>
.group-description.os-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: var(--space-base) !important;
}

.description-clamp {
  flex-grow: 1;
  margin-bottom: var(--space-small);
}
</style>
