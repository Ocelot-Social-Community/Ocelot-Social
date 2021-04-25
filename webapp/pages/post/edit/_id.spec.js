import { mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue

describe('post/_id.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
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
      expect(wrapper.findAll('.contribution-form')).toHaveLength(1)
    })
  })
})
