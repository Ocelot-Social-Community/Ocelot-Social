<template>
  <a :href="item.url" target="_blank" rel="noopener noreferrer">
    <favicon :src="item.favicon" :size="16" />
    {{ item.url }}
  </a>
</template>

<script>
import Favicon from '~/components/SocialMedia/Favicon.vue'

export default {
  name: 'SocialMediaListItem',
  components: { Favicon },
  props: {
    item: {
      type: Object,
      default: () => ({}),
    },
  },
}
</script>
