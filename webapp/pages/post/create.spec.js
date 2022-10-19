import { mount } from '@vue/test-utils'
import create from './create.vue'

const localVue = global.localVue

describe('create.vue', () => {
  let wrapper

  const mocks = {
    $t: jest.fn(),
    $env: {
      CATEGORIES_ACTIVE: false,
    },
    $route: {
      query: {
        groupId: null,
      },
    },
  }

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
