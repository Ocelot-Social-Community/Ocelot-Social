import { config, mount } from '@vue/test-utils'
import searchResults from './search-results.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

config.stubs['client-only'] = '<span class="client-only"><slot /></span>'

describe('search-results.vue', () => {
  let wrapper
  let mocks
  let asyncData
  let query

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
    asyncData = false
    query = {}
  })

  describe('mount', () => {
    const Wrapper = async () => {
      if (asyncData) {
        const data = searchResults.data ? searchResults.data() : {}
        const aData = await searchResults.asyncData({
          query,
        })
        searchResults.data = function () {
          return { ...data, ...aData }
        }
      }
      return mount(searchResults, { mocks, localVue })
    }

    it('renders', async () => {
      wrapper = await Wrapper()
      expect(wrapper.findAll('.search-results')).toHaveLength(1)
    })

    it('has correct <head> content', async () => {
      wrapper = await Wrapper()
      expect(wrapper.vm.$metaInfo.title).toBe('search.title')
    })

    it('renders with asyncData and no query', async () => {
      asyncData = true
      wrapper = await Wrapper()
      expect(wrapper.vm.search).toBe(null)
    })

    it('renders with asyncData and query', async () => {
      asyncData = true
      query = { search: 'hello' }
      wrapper = await Wrapper()
      expect(wrapper.vm.search).toBe('hello')
    })
  })
})
