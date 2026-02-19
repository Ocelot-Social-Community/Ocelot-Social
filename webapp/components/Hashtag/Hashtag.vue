<template>
  <span class="ds-tag ds-tag-size-base ds-tag-medium hc-hashtag">
    <nuxt-link :to="hashtagUrl">#{{ id }}</nuxt-link>
  </span>
</template>

<script>
export default {
  name: 'HcHashtag',
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
