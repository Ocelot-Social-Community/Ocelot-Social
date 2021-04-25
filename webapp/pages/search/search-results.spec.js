import { config, mount } from '@vue/test-utils'
import searchResults from './search-results.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

config.stubs['client-only'] = '<span class="client-only"><slot /></span>'

describe('search-results.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(searchResults, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.search-results')).toHaveLength(1)
    })

    it('has correct <head> content', () => {
      expect(wrapper.vm.$metaInfo.title).toBe('search.title')
    })
  })
})
