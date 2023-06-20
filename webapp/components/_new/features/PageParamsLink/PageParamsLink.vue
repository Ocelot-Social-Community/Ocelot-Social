<template>
  <nuxt-link
    v-if="isInternalLink"
    :to="pageParams.internalPage.pageRoute"
    :data-test="pageParams.name + '-nuxt-link'"
  >
    <slot />
  </nuxt-link>
  <a
    v-else
    :href="href"
    :target="target"
    :data-test="pageParams.name + '-link'"
  >
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
      return pageParams.isInternalPage ? pageParams.internalPage.pageRoute : pageParams.externalLink.url
    },
    target() {
      return forceTargetBlank ? '_blank' : !pageParams.isInternalPage ? pageParams.externalLink.target : ''
    },
    isInternalLink() {
      return !forceTargetBlank && pageParams.isInternalPage
    },
  }
}
</script>
