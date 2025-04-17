<template>
  <delete-data />
</template>

<script>
import DeleteData from '~/components/DeleteData/DeleteData.vue'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    DeleteData,
  },
}
</script>
