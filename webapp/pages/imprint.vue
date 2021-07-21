<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h2">{{ $t('site.imprint') }}</ds-heading>
    </ds-space>
    <ds-container>
      <div v-html="$t('html.imprint')" />
    </ds-container>
  </div>
</template>

<script>
export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.imprint'),
    }
  },
}
</script>
