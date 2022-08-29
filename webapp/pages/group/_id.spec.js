import { config, mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue

config.stubs['nuxt-child'] = '<span class="nuxt-child"><slot /></span>'

describe('Group profile _id.vue', () => {
  let wrapper
  let Wrapper
  let mocks

  beforeEach(() => {
    mocks = {}
  })

  describe('mount', () => {
    Wrapper = () => {
      return mount(_id, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.nuxt-child')).toHaveLength(1)
    })
  })
})
