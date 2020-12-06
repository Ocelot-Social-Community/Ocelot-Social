<template>
  <div>
    <ds-space>
      <ds-heading tag="h2">{{ $t('site.code-of-conduct') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="$t('html.codeOfConduct')" />
    </ds-container>
  </div>
</template>

<script>
export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.code-of-conduct'),
    }
  },
}
</script>
