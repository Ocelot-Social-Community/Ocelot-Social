import { config, mount } from '@vue/test-utils'
import PageFooter from './PageFooter.vue'
import links from '~/constants/links.js'

const localVue = global.localVue

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('PageFooter.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $env: {
        VERSION: 'v1.0.0',
      },
      links,
    }
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return mount(PageFooter, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders three links', () => {
      expect(wrapper.findAll('a')).toHaveLength(3)
    })

    it('renders four nuxt-links', () => {
      expect(wrapper.findAll('.nuxt-link')).toHaveLength(4)
    })
  })
})
