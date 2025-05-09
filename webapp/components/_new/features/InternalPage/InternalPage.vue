<template>
  <div>
    <ds-space margin="small">
      <ds-heading v-if="pageParams.internalPage.headlineIdent !== null" tag="h2">
        {{ $t(pageParams.internalPage.headlineIdent) }}
      </ds-heading>
    </ds-space>
    <ds-container v-if="pageParams.internalPage.hasContainer">
      <div v-if="!pageParams.internalPage.hasBaseCard">
        <br />
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </div>
      <base-card v-else>
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </base-card>
    </ds-container>
    <div v-else-if="!pageParams.internalPage.hasBaseCard">
      <br />
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </div>
    <base-card v-else>
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </base-card>
  </div>
</template>

<script>
export default {
  name: 'InternalPage',
  props: {
    pageParams: { type: Object, required: true },
  },
}
</script>

<style lang="scss" scoped>
@media only screen and (max-width: 500px) {
  .ds-container {
    padding-left: 0 !important;
    padding-right: 0 !important;

    .base-card {
      padding: 16px !important;
    }
  }
}
</style>
