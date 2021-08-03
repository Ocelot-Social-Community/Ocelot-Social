<template>
  <internal-page :pageParams="links.TERMS_AND_CONDITIONS" />
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
