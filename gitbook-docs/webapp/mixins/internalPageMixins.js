import InternalPage from '~/components/_new/features/InternalPage/InternalPage.vue'

export function internalPageMixins(pageParams) {
  return {
    layout: 'basic',
    components: {
      InternalPage,
    },
    data() {
      return { pageParams }
    },
    head() {
      return {
        title: this.$t(this.pageParams.internalPage.headTitleIdent),
      }
    },
    created() {
      if (!this.pageParams.isInternalPage) {
        this.pageParams.redirectToPage(this)
      }
    },
  }
}
