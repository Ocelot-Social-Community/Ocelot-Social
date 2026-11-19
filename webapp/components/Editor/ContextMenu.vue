<script>
import tippy from 'tippy.js'

export default {
  props: {
    content: Object,
    node: Object,
  },
  methods: {
    displayContextMenu(target, content, type) {
      // The link input sits under the selected text; its anchor is a virtual reference, which has
      // nothing to click, so it is opened and closed by the editor ('manual').
      const placement = type === 'link' ? 'bottom-start' : 'top-start'
      const trigger = type === 'link' ? 'manual' : 'mouseenter'

      if (this.menu) {
        return
      }

      // `tippy(target)` with anything that is not an element returns an ARRAY of instances (empty,
      // for a nullish target) rather than throwing — so a missing anchor would surface much later
      // as "this.menu.show is not a function". Refuse it here instead.
      if (!target) {
        return
      }

      this.menu = tippy(target, {
        arrow: true,
        arrowType: 'round',
        content: content,
        duration: [400, 200],
        inertia: true,
        interactive: true,
        // The suggestion list is hidden and brought back with the editor's focus (suspend/resume
        // below). Left to tippy, a click anywhere else would hide it for good: the instance stays,
        // so displayContextMenu() above sees a menu and never shows it again.
        hideOnClick: type === 'link',
        // Re-reads the virtual anchor on every frame, so a layout shift above the selection (an
        // image or a font that loads) moves the link input along; the observer below only sees
        // changes of the input itself.
        sticky: type === 'link',
        placement,
        theme: 'ocelot-social',
        trigger,
        onMount(instance) {
          const input = instance.popper.querySelector('input')

          if (input) {
            input.focus({ preventScroll: true })
          }
        },
      })
      this.menu.show()

      // we have to update tippy whenever the DOM is updated
      if (MutationObserver) {
        this.observer = new MutationObserver(() => {
          this.menu.popperInstance.scheduleUpdate()
        })
        this.observer.observe(content, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }
    },
    // Hides the menu without giving it up — resume() brings it back as it was.
    suspend() {
      if (this.menu) {
        this.menu.hide()
      }
    },
    resume() {
      if (this.menu) {
        this.menu.show()
      }
    },
    hideContextMenu() {
      if (this.menu) {
        const menu = this.menu
        this.menu = null
        menu.destroy()
      }
      if (this.observer) {
        this.observer.disconnect()
      }
    },
  },
  // An open popup lives on document.body, not in this component: without this it would stay after
  // the editor is gone, with its anchor (and so the editor's view) and the sticky frame loop alive.
  beforeDestroy() {
    this.hideContextMenu()
  },
  render() {
    return null
  },
}
</script>

<style>
.tippy-tooltip.ocelot-social-theme {
  background-color: var(--color-primary);
  padding: 0;
  font-size: 1rem;
  text-align: inherit;
  color: var(--text-color-on-primary);

  .tippy-backdrop {
    display: none;
  }

  .tippy-roundarrow {
    fill: var(--color-primary);
  }
  .tippy-popper[x-placement^='top'] & .tippy-arrow {
    border-top-color: var(--color-primary);
  }
  .tippy-popper[x-placement^='bottom'] & .tippy-arrow {
    border-bottom-color: var(--color-primary);
  }
  .tippy-popper[x-placement^='left'] & .tippy-arrow {
    border-left-color: var(--color-primary);
  }
  .tippy-popper[x-placement^='right'] & .tippy-arrow {
    border-right-color: var(--color-primary);
  }
}
</style>
