<template>
  <v-popover
    :open.sync="isPopoverOpen"
    :open-group="Math.random().toString()"
    :placement="placement"
    :disabled="disabled"
    trigger="manual"
    :offset="offset"
    @auto-hide="isPopoverOpen = false"
  >
    <slot :toggleMenu="toggleMenu" :openMenu="openMenu" :closeMenu="closeMenu" :isOpen="isOpen" />
    <div slot="popover" @mouseover="popoverMouseEnter" @mouseleave="popoverMouseLeave">
      <slot
        name="popover"
        :toggleMenu="toggleMenu"
        :openMenu="openMenu"
        :closeMenu="closeMenu"
        :isOpen="isOpen"
      />
    </div>
  </v-popover>
</template>

<script>
let mouseEnterTimer = null
let mouseLeaveTimer = null

export default {
  props: {
    placement: { type: String, default: 'bottom-end' },
    disabled: { type: Boolean, default: false },
    offset: { type: [String, Number], default: '16' },
    noMouseLeaveClosing: { type: Boolean, default: false },
  },
  data() {
    return {
      isPopoverOpen: false,
    }
  },
  computed: {
    isOpen() {
      return this.isPopoverOpen
    },
  },
  watch: {
    isPopoverOpen: {
      handler(isOpen) {
        if (typeof document === 'undefined') return
        if (isOpen) {
          document.body.classList.add('dropdown-open')
          this.addOverlayClickHandler()
        } else {
          document.body.classList.remove('dropdown-open')
          this.removeOverlayClickHandler()
        }
      },
    },
  },
  beforeDestroy() {
    clearTimeout(mouseEnterTimer)
    clearTimeout(mouseLeaveTimer)
    this.removeOverlayClickHandler()
    if (this.isPopoverOpen) {
      this.isPopoverOpen = false
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dropdown-open')
      }
    }
  },
  methods: {
    toggleMenu() {
      this.isPopoverOpen ? this.closeMenu(false) : this.openMenu(false)
    },
    openMenu(useTimeout) {
      if (this.disabled) {
        return
      }
      this.clearTimeouts()
      if (useTimeout === true) {
        this.popoverMouseEnter()
      } else {
        this.isPopoverOpen = true
      }
    },
    closeMenu(useTimeout) {
      if (this.noMouseLeaveClosing || this.disabled) {
        return
      }
      this.clearTimeouts()
      if (useTimeout === true) {
        this.popoverMouseLeave()
      } else {
        this.isPopoverOpen = false
      }
    },
    popoverMouseEnter() {
      if (this.disabled) {
        return
      }
      this.clearTimeouts()
      if (!this.isPopoverOpen) {
        mouseEnterTimer = setTimeout(() => {
          this.isPopoverOpen = true
        }, 500)
      }
    },
    popoverMouseLeave() {
      if (this.noMouseLeaveClosing || this.disabled) {
        return
      }
      this.clearTimeouts()
      if (this.isPopoverOpen) {
        mouseLeaveTimer = setTimeout(() => {
          this.isPopoverOpen = false
        }, 300)
      }
    },
    clearTimeouts() {
      clearTimeout(mouseEnterTimer)
      clearTimeout(mouseLeaveTimer)
    },
    addOverlayClickHandler() {
      this.overlayClickHandler = (e) => {
        // Allow clicks inside the popover content (rendered under <body> by v-tooltip)
        if (e.target.closest('.tooltip-inner, .popover-inner')) return
        // Allow clicks on the trigger itself
        if (this.$el.contains(e.target)) return
        e.stopPropagation()
        e.preventDefault()
        this.isPopoverOpen = false
      }
      // Capture phase fires before any other handler
      setTimeout(() => {
        if (this.isPopoverOpen && this.overlayClickHandler) {
          document.addEventListener('click', this.overlayClickHandler, true)
        }
      }, 0)
    },
    removeOverlayClickHandler() {
      if (!this.overlayClickHandler) return
      document.removeEventListener('click', this.overlayClickHandler, true)
      this.overlayClickHandler = null
    },
  },
}
</script>
