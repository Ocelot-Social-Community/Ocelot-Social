<template>
  <div>
    <ds-space>
      <ds-heading tag="h2">{{ $t('site.termsAndConditions') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="translatedTermsAndConditions" />
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
  computed: {
    translatedTermsAndConditions() {
      return this.$t('html.termsAndConditions')
    },
  },
}
</script>
