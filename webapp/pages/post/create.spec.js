import { mount } from '@vue/test-utils'
import create from './create.vue'
import Vuex from 'vuex'

const localVue = global.localVue

describe('create.vue', () => {
  let wrapper

  const mocks = {
    $t: jest.fn(),
    $route: {
      query: {
        groupId: null,
      },
    },
  }

  const stubs = {
    ContributionForm: true,
  }

  describe('mount', () => {
    const store = new Vuex.Store({
      getters: {
        'categories/categoriesActive': () => false,
      },
    })

    const Wrapper = () => {
      return mount(create, { mocks, localVue, stubs, store })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findComponent({ name: 'ContributionForm' }).exists()).toBe(true)
    })
  })
})
