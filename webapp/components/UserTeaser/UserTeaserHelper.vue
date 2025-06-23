<template>
  <button v-if="showPopover && isTouchDevice" @click.prevent="openMenu">
    <slot />
  </button>
  <span
    v-else-if="!linkToProfile || !userLink"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </span>
  <nuxt-link
    v-else
    :to="userLink"
    @mouseenter.native="handleMouseEnter"
    @mouseleave.native="handleMouseLeave"
  >
    <slot />
  </nuxt-link>
</template>

<script>
import { isTouchDevice } from '../utils/isTouchDevice'

export default {
  name: 'UserTeaserHelper',
  props: {
    userLink: { type: Object, default: null },
    linkToProfile: { type: Boolean, default: true },
    showPopover: { type: Boolean, default: false },
    hoverDelay: { type: Number, default: 500 },
  },
  data() {
    return {
      hoverTimer: null,
      isHovering: false,
    }
  },
  computed: {
    isTouchDevice() {
      return isTouchDevice()
    },
  },
  methods: {
    handleMouseEnter() {
      if (!this.showPopover) return

      this.isHovering = true

      this.clearHoverTimer()
      this.hoverTimer = setTimeout(() => {
        // Only open if still hovering
        if (this.isHovering) {
          this.openMenu()
        }
      }, this.hoverDelay)
    },

    handleMouseLeave() {
      if (!this.showPopover) return

      this.isHovering = false
      this.clearHoverTimer()
      this.closeMenu()
    },

    clearHoverTimer() {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer)
        this.hoverTimer = null
      }
    },

    openMenu() {
      this.$emit('open-menu')
    },

    closeMenu() {
      this.$emit('close-menu')
    },
  },

  beforeDestroy() {
    this.clearHoverTimer()
  },
}
</script>
