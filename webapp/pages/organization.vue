<template>
  <internal-page
    :pageParams="links.ORGANIZATION"
  />
  <!-- Wolle <div>
    <ds-space margin="small">
      <ds-heading tag="h2">{{ $t('site.made') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="$t('html.organization')" />
    </ds-container>
  </div> -->
</template>

<script>
import links from '~/constants/links.js'
import InternalPage from '~/components/_new/features/InternalPage/InternalPage.vue'

export default {
  components: {
    InternalPage,
  },
  // Wolle 
  layout: 'basic',
  data() {
    // Wolle console.log(links.ORGANIZATION)
    return { links }
  },
  // Wolle head() {
  //   return {
  //     title: this.$t('site.made'),
  //   }
  // },
}
</script>
