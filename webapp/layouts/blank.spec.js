import { config, shallowMount } from '@vue/test-utils'
import Blank from './blank.vue'

const localVue = global.localVue

config.stubs.nuxt = '<span><slot /></span>'

describe('blank.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('shallow mount', () => {
    const Wrapper = () => {
      return shallowMount(Blank, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.layout-blank')).toBe(true)
    })
  })
})
