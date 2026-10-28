<template>
  <div
    v-if="modules.length"
    :class="['dock', `dock--${side}`, wide ? 'dock--rail' : 'dock--drawer', { 'dock--open': open }]"
    :hidden="!count"
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
    },
    $route() {
      this.close()
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
  },
  beforeDestroy() {
    this.mediaQuery.removeEventListener('change', this.onMediaChange)
  },
  methods: {
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

/*  Rail: beside the 1200px content column, fixed below the header. */
.dock--rail .dock__panel {
  position: fixed;
  top: 6rem;
  width: 256px;
  max-height: calc(100vh - 6rem - var(--space-x-large));
  overflow-y: auto;
}
.dock--rail.dock--right .dock__panel {
  right: calc((100vw - 1200px) / 2 - 256px - 24px);
}
.dock--rail.dock--left .dock__panel {
  left: calc((100vw - 1200px) / 2 - 256px - 24px);
}

/*  Flag: a tab at the screen edge, vertically centred — the bottom corners belong to the */
/*  floating chat and the minimised call. */
.dock__flag {
  position: fixed;
  top: 50%;
  z-index: var(--z-index-sticky-float);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 56px;
  padding: 0;
  border: none;
  background-color: var(--color-primary);
  color: var(--color-primary-inverse);
  box-shadow: var(--box-shadow-base);
  cursor: pointer;
  transform: translateY(-50%);
}
.dock--right .dock__flag {
  right: 0;
  border-radius: var(--border-radius-x-large) 0 0 var(--border-radius-x-large);
}
.dock--left .dock__flag {
  left: 0;
  border-radius: 0 var(--border-radius-x-large) var(--border-radius-x-large) 0;
}
.dock__flag:focus-visible {
  outline: 2px solid var(--color-primary-dark);
  outline-offset: 2px;
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
