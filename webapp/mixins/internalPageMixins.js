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
    created() {
      if (!this.pageParams.isInternalPage) {
        window.location.href = this.pageParams.externalLink
      }
    },
  }
}
