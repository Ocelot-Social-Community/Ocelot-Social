import { config, mount } from '@vue/test-utils'
import admin from './admin.vue'

config.stubs['nuxt-child'] = '<span><slot /></span>'

const localVue = global.localVue

describe('admin.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(admin, {
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
