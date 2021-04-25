import { config, mount } from '@vue/test-utils'
import searchResults from './search-results.vue'

const localVue = global.localVue
config.stubs['client-only'] = '<span class="client-only"><slot /></span>'

describe('search-results.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
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

  })
})
