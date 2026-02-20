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
      return `/?hashtag=${this.id}`
    },
  },
}
</script>
