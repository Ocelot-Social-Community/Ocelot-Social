<template>
  <a :href="item.url" target="_blank">
    <img :src="item.favicon" alt="Link:" height="16" width="16" />
    {{ item.url }}
  </a>
</template>

<script>
export default {
  name: 'OrganisationListItem',
  props: {
    item: {
      type: Object,
      default: () => ({}),
    },
  },
}
</script>
