import { config, mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue
config.stubs['nuxt-child'] = '<span class="nuxt-child"><slot /></span>'

describe('profile/_id.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn()
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(_id, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.nuxt-child')).toHaveLength(1)
    })

  })
})
