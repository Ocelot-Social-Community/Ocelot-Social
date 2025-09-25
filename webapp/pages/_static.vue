<template>
  <div>
    <internal-page :pageParams="pageParams" />
  </div>
</template>

<script>
import { internalPageMixins } from '~/mixins/internalPageMixins'

export default {
  mixins: [internalPageMixins()],
}
</script>
