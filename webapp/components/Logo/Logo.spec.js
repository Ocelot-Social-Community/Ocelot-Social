import { mount } from '@vue/test-utils'
import Logo from './Logo.vue'

const localVue = global.localVue

describe('Logo.vue', () => {
  let mocks, propsData, wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    propsData = {
      logoType: 'header',
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Logo, { mocks, localVue, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-logo')).toHaveLength(1)
    })
  })
})
