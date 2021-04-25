import { config, mount } from '@vue/test-utils'
import Logo from './Logo.vue'

const localVue = global.localVue
// config.stubs['client-only'] = '<span><slot /></span>'

describe('Logo.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn()
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Logo, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-logo')).toHaveLength(1)
    })

  })
})
