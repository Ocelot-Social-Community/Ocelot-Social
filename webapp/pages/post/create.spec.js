import { mount } from '@vue/test-utils'
import create from './create.vue'

const localVue = global.localVue

describe('create.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(create, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.contribution-form')).toHaveLength(1)
    })

  })
})
