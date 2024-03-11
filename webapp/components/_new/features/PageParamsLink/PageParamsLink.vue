<template>
  <nuxt-link
    v-if="isInternalLink"
    :to="pageParams.internalPage.pageRoute"
    :data-test="pageParams.name + '-nuxt-link'"
  >
    <slot />
  </nuxt-link>
  <a v-else :href="href" :target="target" :data-test="pageParams.name + '-link'">
    <slot />
  </a>
</template>

<script>
export default {
  name: 'PageParamsLink',
  props: {
    pageParams: { type: Object, required: true },
    forceTargetBlank: { type: Boolean, default: false },
  },
  computed: {
    href() {
      return this.pageParams.isInternalPage
        ? this.pageParams.internalPage.pageRoute
        : this.pageParams.externalLink.url
    },
    target() {
      return this.forceTargetBlank
        ? '_blank'
        : !this.pageParams.isInternalPage
          ? this.pageParams.externalLink.target
          : ''
    },
    isInternalLink() {
      return !this.forceTargetBlank && this.pageParams.isInternalPage
    },
  },
}
</script>
