<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h2">{{ $t('site.faq') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="$t('html.faq')" />
    </ds-container>
  </div>
</template>

<script>
export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.faq'),
    }
  },
}
</script>
