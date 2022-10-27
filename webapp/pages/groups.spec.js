import { config, mount } from '@vue/test-utils'
import groups from './groups.vue'

const localVue = global.localVue

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'
config.stubs['client-only'] = '<span class="client-only"><slot /></span>'

describe('groups', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(groups, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('div')).toBe(true)
    })
  })
})
