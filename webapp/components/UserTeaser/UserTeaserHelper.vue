<template>
  <button v-if="showPopover && isTouchDevice" @click.prevent="openMenu">
    <slot />
  </button>
  <span
    v-else-if="!linkToProfile || !userLink"
    @mouseover="() => showPopover && openMenu()"
    @mouseleave="closeMenu"
  >
    <slot />
  </span>
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
import { isTouchDevice } from '../utils/isTouchDevice'

export default {
  name: 'UserTeaserHelper',
  props: {
    userLink: { type: Object, default: null },
    linkToProfile: { type: Boolean, default: true },
    showPopover: { type: Boolean, default: false },
  },
  computed: {
    isTouchDevice() {
      return isTouchDevice()
    },
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
