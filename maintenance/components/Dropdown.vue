<template>
  <v-popover
    v-model:open="isPopoverOpen"
    :open-group="Math.random().toString()"
    :placement="placement"
    :disabled="disabled"
    trigger="manual"
    :offset="offset"
  >
    <slot :toggle-menu="toggleMenu" :open-menu="openMenu" :close-menu="closeMenu" :is-open="isOpen" />
    <template #popover>
<div  @mouseover="popoverMouseEnter" @mouseleave="popoverMouseLeave">
      <slot
        name="popover"
        :toggle-menu="toggleMenu"
        :open-menu="openMenu"
        :close-menu="closeMenu"
        :is-open="isOpen"
      />
    </div>
</template>
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
  },
  data() {
    return {
      isPopoverOpen: false,
      developerNoAutoClosing: false, // stops automatic closing of menu for developer purposes: default is 'false'
    }
  },
  computed: {
    isOpen() {
      return this.isPopoverOpen
    },
  },
  watch: {
    isPopoverOpen: {
      immediate: true,
      handler(isOpen) {
        try {
          if (isOpen) {
            this.$nextTick(() => {
              setTimeout(() => {
                const paddingRightStyle = `${
                  window.innerWidth - document.documentElement.clientWidth
                }px`
                const navigationElement = document.querySelector('.main-navigation')
                document.body.style.paddingRight = paddingRightStyle
                document.body.classList.add('dropdown-open')
                if (navigationElement) {
                  navigationElement.style.paddingRight = paddingRightStyle
                }
              }, 20)
            })
          } else {
            const navigationElement = document.querySelector('.main-navigation')
            document.body.style.paddingRight = null
            document.body.classList.remove('dropdown-open')
            if (navigationElement) {
              navigationElement.style.paddingRight = null
            }
          }
        } catch (err) {}
      },
    },
  },
  beforeUnmount() {
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
      if (this.disabled) {
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
      if (this.developerNoAutoClosing) return
      if (this.disabled) {
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
