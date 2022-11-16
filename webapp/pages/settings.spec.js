import { config, mount } from '@vue/test-utils'
import settings from './settings.vue'

const localVue = global.localVue

config.stubs['nuxt-child'] = '<span class="nuxt-child"><slot /></span>'

describe('settings.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(settings, {
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
