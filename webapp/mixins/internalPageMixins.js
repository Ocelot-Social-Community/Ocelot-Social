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
        // to avoid possible errors, because 'window' is only defined on browser side but not in NodeJS on client side. check for 'typeof window' is neccessary, because if it's not defined at all you can't check for 'window !== undefined' without the same error 'window is undefined'
        if (typeof window !== 'undefined') {
          window.location.href = this.pageParams.externalLink
        }
      }
    },
  }
}
