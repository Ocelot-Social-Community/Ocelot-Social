<template>
  <div>
    <div class="ds-my-small">
      <h2 v-if="pageParams.internalPage.headlineIdent !== null" class="ds-heading ds-heading-h2">
        {{ $t(pageParams.internalPage.headlineIdent) }}
      </h2>
    </div>
    <div class="ds-container ds-container-x-large" v-if="pageParams.internalPage.hasContainer">
      <div v-if="!pageParams.internalPage.hasBaseCard">
        <br />
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </div>
      <os-card v-else>
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </os-card>
    </div>
    <div v-else-if="!pageParams.internalPage.hasBaseCard">
      <br />
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </div>
    <os-card v-else>
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { PageParams } from '~/components/utils/PageParams.js'

export default {
  components: { OsCard },
  name: 'InternalPage',
  props: {
    pageParams: { type: Object, required: true },
  },
  created() {
    const pageParamsObj = new PageParams({
      ...this.pageParams,
    })
    if (!pageParamsObj.isInternalPage) {
      pageParamsObj.redirectToPage(this)
    }
  },
}
</script>

<style lang="scss" scoped>
@media only screen and (max-width: 500px) {
  .ds-container {
    padding-left: 0 !important;
    padding-right: 0 !important;

    .os-card {
      padding: $space-small !important;
    }
  }
}
</style>
