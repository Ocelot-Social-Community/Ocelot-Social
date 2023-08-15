import { shallowMount } from '@vue/test-utils'
import Blank from './blank.vue'

const localVue = global.localVue

const stubs = {
  nuxt: {
    template: '<span><slot /></span>',
  },
}

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
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('layout-blank')).toBe(true)
    })
  })
})
