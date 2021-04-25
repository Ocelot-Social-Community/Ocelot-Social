import { config, mount } from '@vue/test-utils'
import TermsAndConditionsConfirm from './terms-and-conditions-confirm.vue'

const localVue = global.localVue

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('terms-and-conditions-confirm.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(TermsAndConditionsConfirm, {
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
