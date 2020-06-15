<template>
  <div>
    <ds-space>
      <ds-heading tag="h2">{{ $t('site.code-of-conduct') }}</ds-heading>
      <p>{{ $t('code-of-conduct.subheader', metadata) }}</p>
    </ds-space>

    <ds-container>
      <div v-html="$t('html.codeOfConduct')" />
    </ds-container>
  </div>
</template>

<script>
import metadata from '~/constants/metadata.js'

export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.code-of-conduct'),
    }
  },
  data() {
    return {
      metadata,
    }
  },
}
</script>
