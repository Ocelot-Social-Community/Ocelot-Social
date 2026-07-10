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
        <div v-html="content" />
      </div>
      <os-card v-else>
        <div v-html="content" />
      </os-card>
    </div>
    <div v-else-if="!pageParams.internalPage.hasBaseCard">
      <br />
      <div v-html="content" />
    </div>
    <os-card v-else>
      <div v-html="content" />
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { PageParams } from '~/components/utils/PageParams.js'
import { fetchBrandingHtml } from '~/components/utils/brandingHtml.js'

export default {
  components: { OsCard },
  name: 'InternalPage',
  props: {
    pageParams: { type: Object, required: true },
  },
  data() {
    return {
      // Brand-shipped HTML loaded at runtime from branding.assets.html (via fetch()); null until
      // loaded or when the page ships no such HTML — then we fall back to the i18n html.
      brandingHtml: null,
    }
  },
  async fetch() {
    this.brandingHtml = await fetchBrandingHtml(this.htmlSrc)
  },
  computed: {
    currentLocale() {
      return (this.$store && this.$store.state.i18n && this.$store.state.i18n.locale) || null
    },
    // The runtime HTML source for the current locale (branding.assets.html[page][locale]), or null.
    htmlSrc() {
      const src = this.pageParams.internalPage.htmlSrc
      if (!src) return null
      // Current UI language, else any shipped locale as a last resort.
      return src[this.currentLocale] || Object.values(src)[0] || null
    },
    // Prefer the brand's runtime HTML; fall back to the build-bundled i18n html so a page that
    // ships no branding HTML (or a fetch miss) renders exactly as before.
    content() {
      return this.brandingHtml != null
        ? this.brandingHtml
        : this.$t(this.pageParams.internalPage.htmlIdent)
    },
  },
  watch: {
    // Re-load the localized HTML when the UI language changes (client-side navigation).
    currentLocale() {
      this.$fetch()
    },
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
