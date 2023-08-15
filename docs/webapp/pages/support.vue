<template>
  <internal-page :pageParams="pageParams" />
</template>

<script>
import links from '~/constants/links.js'
import { internalPageMixins } from '~/mixins/internalPageMixins'

export default {
  mixins: [internalPageMixins(links.SUPPORT)],
}
</script>
