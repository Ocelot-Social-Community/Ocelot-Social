import { mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-child': true,
}

describe('Profile _id.vue', () => {
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
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findComponent({ name: 'nuxt-child' }).exists()).toBe(true)
    })
  })
})
