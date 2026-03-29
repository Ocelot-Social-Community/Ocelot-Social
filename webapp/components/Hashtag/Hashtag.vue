<template>
  <os-badge shape="square" class="hc-hashtag">
    <nuxt-link :to="hashtagUrl">#{{ id }}</nuxt-link>
  </os-badge>
</template>

<script>
import { OsBadge } from '@ocelot-social/ui'

export default {
  name: 'HcHashtag',
  components: { OsBadge },
  props: {
    id: { type: String, required: true },
  },
  computed: {
    hashtagUrl() {
      // Wolle return `/?hashtag=${this.id}`
      return `/search/search-results?search=%23${this.id}` // hashtag as '%23' has to be used for '#' explicitly! otherwise it is interpreted as the site path hashtag
    },
  },
}
</script>
