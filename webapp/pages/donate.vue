<template>
  <internal-page :pageParams="links.DONATE" />
</template>

<script>
import links from '~/constants/links.js'
import InternalPage from '~/components/_new/features/InternalPage/InternalPage.vue'

export default {
  layout: 'basic',
  components: {
    InternalPage,
  },
  data() {
    return { links }
  },
  created() {
    if (!this.links.DONATE.isInternalPage) {
      window.location.href = this.links.DONATE.externalLink
    }
  },
}
</script>
