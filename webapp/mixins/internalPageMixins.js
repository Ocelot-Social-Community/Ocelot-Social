import InternalPage from '~/components/_new/features/InternalPage/InternalPage.vue'
import links from '~/constants/links.js'

export function internalPageMixins() {
  return {
    layout: 'basic',
    components: {
      InternalPage,
    },
    head() {
      return {
        title: this.$t(this.pageParams.internalPage.headTitleIdent),
      }
    },
    async asyncData({ params, error }) {
      const [link] = Object.keys(links).filter((key) => links[key].name === params.static)
      if (!link)
        return error({
          statusCode: 404,
          key: 'error-pages.404-default',
        })
      return {
        pageParams: links[link],
      }
    },
  }
}
