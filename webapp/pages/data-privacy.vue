<template>
  <div>
    <ds-space>
      <ds-heading tag="h2">{{ $t('site.data-privacy') }}</ds-heading>
    </ds-space>

    <ds-container>
      <div v-html="$t('html.dataPrivacy')" />
    </ds-container>
  </div>
</template>

<script>
export default {
  layout: 'basic',
  head() {
    return {
      title: this.$t('site.data-privacy'),
    }
  },
}
</script>
