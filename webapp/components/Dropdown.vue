<template>
  <v-popover
    :open.sync="isPopoverOpen"
    :open-group="Math.random().toString()"
    :placement="placement"
    :disabled="disabled"
    trigger="manual"
    :offset="offset"
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
        if (isOpen) {
          document.body.classList.add('dropdown-open')
        } else {
          document.body.classList.remove('dropdown-open')
        }
      },
    },
  },
  beforeDestroy() {
    clearTimeout(mouseEnterTimer)
    clearTimeout(mouseLeaveTimer)
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
  },
}
</script>
