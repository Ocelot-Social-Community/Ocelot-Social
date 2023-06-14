<template>
  <nuxt-link
    v-if="!forceTargetBlank && pageParams.isInternalPage"
    :to="pageParams.internalPage.pageRoute"
    :data-test="pageParams.name + '-nuxt-link'"
  >
    <slot />
  </nuxt-link>
  <a
    v-else
    :href="
      pageParams.isInternalPage ? pageParams.internalPage.pageRoute : pageParams.externalLink.url
    "
    :target="
      forceTargetBlank ? '_blank' : pageParams.isInternalPage ? '' : pageParams.externalLink.target
    "
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
}
</script>
