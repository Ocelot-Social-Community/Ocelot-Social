import { config, mount } from '@vue/test-utils'
import Moderation from './index.vue'

const localVue = global.localVue
config.stubs['client-only'] = '<span><slot /></span>'

describe('moderation/index.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Moderation, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.base-card')).toBe(true)
    })
  })
})
