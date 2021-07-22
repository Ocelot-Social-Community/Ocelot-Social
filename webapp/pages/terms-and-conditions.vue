<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h2">{{ $t('site.termsAndConditions') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="$t('html.termsAndConditions')" />
    </ds-container>
  </div>
</template>

<script>
export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.termsAndConditions'),
    }
  },
}
</script>
