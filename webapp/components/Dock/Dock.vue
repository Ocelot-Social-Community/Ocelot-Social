<template>
  <div
    v-if="modules.length"
    :class="['dock', `dock--${side}`, wide ? 'dock--rail' : 'dock--drawer']"
    :hidden="!count"
    :style="top !== null ? { top: `${top}px`, '--dock-start': `${top}px` } : null"
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
    <aside v-if="wide" :id="panelId" ref="panel" class="dock__panel" :aria-label="$t('dock.label')">
      <component
        :is="module.component"
        v-for="module in modules"
        :key="module.id"
        @count="setCount(module.id, $event)"
      />
    </aside>
    <os-drawer
      v-else
      :id="panelId"
      :open.sync="open"
      :side="side"
      :aria-label="$t('dock.label')"
      :close-label="$t('dock.close')"
      data-test="dock-drawer"
    >
      <component
        :is="module.component"
        v-for="module in modules"
        :key="module.id"
        @count="setCount(module.id, $event)"
      />
    </os-drawer>
  </div>
</template>

<script>
import { OsDrawer, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import registry, { modulesFor } from './modules'

// Where the dock becomes a rail beside the content: the content column is 1200px
// (.ds-container-x-large), and a 256px rail plus a 24px gap must fit on both sides — the
// left dock mirrors the right one, so the content stays centred either way. Below that,
// the dock folds into a flag at the screen edge.
export const RAIL_MEDIA_QUERY = '(min-width: 1760px)'

export default {
  name: 'Dock',
  components: { OsDrawer, OsIcon },
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
      if (matches) this.close()
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
      // OsDrawer takes the focus on open and gives it back to the flag on close.
      this.open = !this.open
    },
    close() {
      this.open = false
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
  /*  Below the header, which hides on scrolling down and sets --header-height to 0 then. */
  /*  Never below where the dock starts (--dock-start, set by align()): sticky would push it */
  /*  down from there before anything is scrolled, off the line of the first post. */
  --dock-sticky-top: min(
    calc(var(--header-height, 5rem) + var(--space-small)),
    var(--dock-start, 100vh)
  );

  position: absolute;
  top: 6rem;
  bottom: 0;
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
  transition: top 0.3s ease;
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
  transition: top 0.3s ease;
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

@media (prefers-reduced-motion: reduce) {
  .dock__flag,
  .dock__panel {
    transition: none;
  }
}
</style>
