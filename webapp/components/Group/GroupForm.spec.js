import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'
import Vuex from 'vuex'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

const propsData = {
  update: false,
  group: {},
}

describe('GroupForm', () => {
  let wrapper
  let mocks
  let storeMocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    storeMocks = {
      getters: {
        'categories/categoriesActive': () => false,
      },
    }
    store = new Vuex.Store(storeMocks)
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupForm, { propsData, mocks, localVue, stubs, store })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-form')).toHaveLength(1)
    })
  })
})
