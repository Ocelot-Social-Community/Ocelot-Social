<template>
  <div
    v-if="modules.length"
    :class="['dock', `dock--${side}`, wide ? 'dock--rail' : 'dock--drawer', { 'dock--open': open }]"
    :hidden="!count"
    :style="top !== null ? { top: `${top}px` } : null"
    data-test="dock"
  >
    <button
      v-if="!wide"
      ref="flag"
      type="button"
      class="dock__flag"
      data-test="dock-flag"
      :aria-expanded="String(open)"
      :aria-controls="panelId"
      :aria-label="$t('dock.open', { count })"
      @click="toggle"
    >
      <os-icon
        v-for="module in modulesWithContent"
        :key="module.id"
        :icon="icons[module.icon]"
        class="dock__flag-icon"
      />
      <span class="dock__flag-count" aria-hidden="true">{{ count }}</span>
    </button>
    <div v-if="!wide && open" class="dock__backdrop" data-test="dock-backdrop" @click="close" />
    <aside
      :id="panelId"
      ref="panel"
      class="dock__panel"
      :aria-label="$t('dock.label')"
      :role="wide ? null : 'dialog'"
      :aria-modal="wide ? null : 'true'"
      :tabindex="wide ? null : '-1'"
      @keydown="onKeydown"
    >
      <button
        v-if="!wide"
        type="button"
        class="dock__close"
        data-test="dock-close"
        :aria-label="$t('dock.close')"
        @click="close"
      >
        <os-icon :icon="icons.close" />
      </button>
      <component
        :is="module.component"
        v-for="module in modules"
        :key="module.id"
        @count="setCount(module.id, $event)"
      />
    </aside>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import registry, { modulesFor } from './modules'

// Where the dock becomes a rail beside the content: the content column is 1200px
// (.ds-container-x-large), and a 256px rail plus a 24px gap must fit on both sides — the
// left dock mirrors the right one, so the content stays centred either way. Below that,
// the dock folds into a flag at the screen edge.
export const RAIL_MEDIA_QUERY = '(min-width: 1760px)'

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]'

export default {
  name: 'Dock',
  components: { OsIcon },
  props: {
    side: { type: String, required: true, validator: (value) => /^(left|right)$/.test(value) },
    // The registry is a prop so a test can hand in its own modules.
    registry: { type: Array, default: () => registry },
  },
  data() {
    return {
      counts: {},
      open: false,
      wide: false,
      // Where the dock starts, in px from the top of the layout; null = the default.
      top: null,
    }
  },
  computed: {
    modules() {
      return modulesFor(this.registry, {
        side: this.side,
        routeName: this.$route.name,
        store: this.$store,
      })
    },
    modulesWithContent() {
      return this.modules.filter(({ id }) => this.counts[id] > 0)
    },
    count() {
      return this.modules.reduce((sum, { id }) => sum + (this.counts[id] || 0), 0)
    },
    panelId() {
      return `dock-panel-${this.side}`
    },
  },
  watch: {
    modules(modules) {
      // A module that left (another page, a switched-off feature) no longer counts.
      const ids = modules.map(({ id }) => id)
      this.counts = Object.fromEntries(
        Object.entries(this.counts).filter(([id]) => ids.includes(id)),
      )
    },
    count(count) {
      if (!count) this.close()
      this.$nextTick(this.align)
    },
    wide() {
      this.$nextTick(this.align)
    },
    $route() {
      this.close()
      this.$nextTick(this.align)
    },
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    this.mediaQuery = window.matchMedia(RAIL_MEDIA_QUERY)
    this.wide = this.mediaQuery.matches
    this.onMediaChange = ({ matches }) => {
      this.wide = matches
      if (matches) this.open = false
    }
    this.mediaQuery.addEventListener('change', this.onMediaChange)
    // Whatever stands above the page content (a donation bar, a filter row) moves it, and
    // most of it arrives late; any change of the page's size is a reason to look again.
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => this.align())
      this.resizeObserver.observe(document.body)
    }
    this.$nextTick(this.align)
  },
  beforeDestroy() {
    this.mediaQuery.removeEventListener('change', this.onMediaChange)
    this.resizeObserver?.disconnect()
  },
  methods: {
    // Lines the dock up with the page content, which the page marks `data-dock-anchor` (the
    // feed grid). The attribute may name what in there is the visible start — the first card,
    // not the grid with the spacing above it. The flag starts there. In the rail, the first element a module marks
    // `data-dock-align` (a list of cards, say) starts there, and what comes before it, a
    // heading, stands above. Without an anchor, the dock keeps its default place below the
    // header.
    align() {
      if (!this.$el.offsetParent) return
      const marked = document.querySelector('[data-dock-anchor]')
      const align = this.wide ? this.$refs.panel.querySelector('[data-dock-align]') : null
      if (!marked || (this.wide && !align)) {
        this.top = null
        return
      }
      // `:scope` never matches a descendant, so no named start is the anchor itself.
      const start = marked.getAttribute('data-dock-anchor') || ':scope'
      const anchor = marked.querySelector(start) || marked
      const layoutTop = this.$el.offsetParent.getBoundingClientRect().top
      const anchorTop = anchor.getBoundingClientRect().top - layoutTop
      const alignOffset = align
        ? align.getBoundingClientRect().top - this.$refs.panel.getBoundingClientRect().top
        : 0
      this.top = Math.round(anchorTop - alignOffset)
    },
    setCount(id, count) {
      this.counts = { ...this.counts, [id]: count }
    },
    toggle() {
      if (this.open) {
        this.close()
      } else {
        this.open = true
        this.$nextTick(() => this.$refs.panel.focus())
      }
    },
    close() {
      if (!this.open) return
      this.open = false
      this.$nextTick(() => this.$refs.flag.focus())
    },
    onKeydown(event) {
      if (!this.open) return
      if (event.key === 'Escape') {
        this.close()
        return
      }
      if (event.key !== 'Tab') return
      // Keep the focus inside the open drawer (it is a modal dialog).
      const focusable = [...this.$refs.panel.querySelectorAll(FOCUSABLE)]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
  },
}
</script>

<style>
.dock[hidden] {
  display: none;
}

/*  The dock runs from the top of the page content (see align()) to the end of the page. What */
/*  it shows — the rail's panel, the flag — scrolls along with the page until it reaches the */
/*  header, and stays there. */
.dock {
  --dock-sticky-top: 6rem;

  position: absolute;
  top: var(--dock-sticky-top);
  bottom: 0;
}
@media (--vp-mobile) {
  .dock {
    --dock-sticky-top: 4.5rem;
  }
}
.dock--drawer.dock--right {
  right: 0;
}
.dock--drawer.dock--left {
  left: 0;
}

/*  Rail: beside the 1200px content column. */
.dock--rail {
  width: 256px;
}
.dock--rail.dock--right {
  right: calc((100% - 1200px) / 2 - 256px - 24px);
}
.dock--rail.dock--left {
  left: calc((100% - 1200px) / 2 - 256px - 24px);
}
.dock--rail .dock__panel {
  position: sticky;
  top: var(--dock-sticky-top);
  max-height: calc(100vh - var(--dock-sticky-top) - var(--space-x-large));
  /*  Room for the cards' shadows, which the scrolling panel would clip. */
  padding: var(--space-xx-small) var(--space-small) var(--space-large);
  margin: calc(-1 * var(--space-xx-small)) calc(-1 * var(--space-small)) 0;
  overflow-y: auto;
}

/*  Flag: a tab at the screen edge, level with the top of the page content — never down in the */
/*  bottom corners, which belong to the floating chat and the minimised call. */
.dock__flag {
  position: sticky;
  top: var(--dock-sticky-top);
  z-index: var(--z-index-sticky-float);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xx-small);
  width: 32px;
  min-height: 56px;
  padding: var(--space-x-small) 0;
  border: none;
  background-color: var(--color-primary);
  color: var(--color-primary-inverse);
  box-shadow: var(--box-shadow-base);
  cursor: pointer;
}
.dock--right .dock__flag {
  border-radius: var(--border-radius-x-large) 0 0 var(--border-radius-x-large);
}
.dock--left .dock__flag {
  border-radius: 0 var(--border-radius-x-large) var(--border-radius-x-large) 0;
}
.dock__flag:focus-visible {
  outline: 2px solid var(--color-primary-dark);
  outline-offset: 2px;
}
.dock__flag-icon {
  font-size: var(--font-size-base);
}
.dock__flag-count {
  font-weight: bold;
}

/*  Drawer: slides in from the dock's side, above everything but modals. */
.dock__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-index-overlay) + 1);
  background-color: rgba(0, 0, 0, 0.3);
}
.dock--drawer .dock__panel {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: calc(var(--z-index-overlay) + 2);
  width: min(320px, 85vw);
  padding: var(--space-base);
  overflow-y: auto;
  background-color: var(--background-color-base);
  box-shadow: var(--box-shadow-x-large);
  visibility: hidden;
  transition:
    transform 0.2s ease,
    visibility 0.2s;
}
.dock--drawer.dock--right .dock__panel {
  right: 0;
  transform: translateX(100%);
}
.dock--drawer.dock--left .dock__panel {
  left: 0;
  transform: translateX(-100%);
}
.dock--drawer.dock--open .dock__panel {
  visibility: visible;
  transform: none;
}
.dock__close {
  display: block;
  margin-left: auto;
  padding: var(--space-xx-small);
  border: none;
  background: none;
  color: var(--text-color-soft);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .dock--drawer .dock__panel {
    transition: none;
  }
}
</style>
