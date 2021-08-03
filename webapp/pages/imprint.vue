<template>
  <internal-page :pageParams="links.IMPRINT" />
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
}
</script>
