import { mount } from '@vue/test-utils'
import Logo from './Logo.vue'

const localVue = global.localVue

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
