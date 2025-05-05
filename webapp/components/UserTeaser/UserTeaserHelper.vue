<template>
  <span v-if="!linkToProfile">
    <slot />
  </span>
  <button v-else-if="linkToProfile && showPopover && isTouchDevice" @click.prevent="openMenu">
    <slot />
  </button>
  <nuxt-link
    v-else
    :to="userLink"
    @mouseover.native="() => showPopover && openMenu()"
    @mouseleave.native="closeMenu"
  >
    <slot />
  </nuxt-link>
</template>

<script>
export default {
  name: 'UserTeaserHelper',
  props: {
    userLink: { type: Object },
    linkToProfile: { type: Boolean, default: true },
    showPopover: { type: Boolean, default: false },
    isTouchDevice: { type: Boolean, default: false },
  },
  methods: {
    openMenu() {
      this.$emit('open-menu')
    },
    closeMenu() {
      this.$emit('close-menu')
    },
  },
}
</script>
