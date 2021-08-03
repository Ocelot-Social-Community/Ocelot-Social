<template>
  <div>
    <ds-space margin="small">
      <!-- Wolle <ds-heading v-if="pageParams.internalPage.headlineIdent !== null" tag="h2">{{ $t(pageParams.internalPage.headlineIdent === '' ? pageValues.defaultHeadlineIdent : pageParams.internalPage.headlineIdent) }}</ds-heading> -->
      <ds-heading v-if="pageParams.internalPage.headlineIdent !== null" tag="h2">{{ $t(pageParams.internalPage.headlineIdent === '' ? pageParams.internalPage.defaultHeadlineIdent : pageParams.internalPage.headlineIdent) }}</ds-heading>
    </ds-space>
    <ds-container v-if="pageParams.internalPage.hasContainer">
      <div v-if="!pageParams.internalPage.hasBaseCard">
        <br>
        <!-- Wolle <div v-html="$t(pageValues.htmlIdent)" /> -->
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </div>
      <base-card v-else>
        <!-- Wolle <div v-html="$t(pageValues.htmlIdent)" /> -->
        <div v-html="$t(pageParams.internalPage.htmlIdent)" />
      </base-card>
    </ds-container>
    <div v-else-if="!pageParams.internalPage.hasBaseCard">
      <br>
      <!-- Wolle <div v-html="$t(pageValues.htmlIdent)" /> -->
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </div>
    <base-card v-else>
      <!-- Wolle <div v-html="$t(pageValues.htmlIdent)" /> -->
      <div v-html="$t(pageParams.internalPage.htmlIdent)" />
    </base-card>
  </div>
</template>

<script>
// Wolle import links from '~/constants/links.js'
// import { pageLink } from '~/components/utils/InternalPages.js'
// import Logo from '~/components/Logo/Logo'

export default {
  name: 'InternalPage',
  head() {
    return {
      title: this.$t(this.pageParams.internalPage.headTitleIdent),
    }
  },
  // Wolle components: {
  //   Logo,
  // },
  props: {
    pageParams: { type: Object, required: true },
  },
  // Wolle data() {
  //   return { links, pageLink }
  // },
  // computed: {
  //   pageValues() {
  //     let values = {}
  //     switch (this.pageParams.name) {
  //       case 'organization':
  //         values.defaultHeadlineIdent = 'site.made'
  //         values.htmlIdent = 'html.organization'
  //         break;
  //       case 'donate':
  //         values.defaultHeadlineIdent = 'site.donate'
  //         values.htmlIdent = 'html.donate'
  //         break;
  //       case 'imprint':
          // values.defaultHeadlineIdent = 'site.imprint'
          // values.htmlIdent = 'html.imprint'
  //         break;
  //       case 'terms-and-conditions':
  //         values.defaultHeadlineIdent = 'site.termsAndConditions'
  //         values.htmlIdent = 'html.termsAndConditions'
  //         break;
  //       case 'code-of-conduct':
  //         values.defaultHeadlineIdent = 'site.code-of-conduct'
  //         values.htmlIdent = 'html.codeOfConduct'
  //         break;
  //       case 'data-privacy':
  //         values.defaultHeadlineIdent = 'site.data-privacy'
  //         values.htmlIdent = 'html.dataPrivacy'
  //         break;
  //       case 'faq':
  //         values.defaultHeadlineIdent = 'site.faq'
  //         values.htmlIdent = 'html.faq'
  //         break;
  //     }
  //     return values
  //   },
  // },
}
</script>
