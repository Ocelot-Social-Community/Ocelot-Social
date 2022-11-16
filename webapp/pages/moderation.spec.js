import { config, mount } from '@vue/test-utils'
import moderation from './moderation.vue'

config.stubs['nuxt-child'] = '<span><slot /></span>'

const localVue = global.localVue

describe('moderation.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(moderation, {
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
