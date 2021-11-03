<template>
  <a :href="link.url" target="_blank">
    <img :src="link.favicon" alt="Link:" height="16" width="16" />
    {{ link.url }}
  </a>
</template>

<script>
export default {
  name: 'SocialMediaListItem',
  props: {
    link: {
      type: Object,
      default: () => ({}),
    },
  },
}
</script>
