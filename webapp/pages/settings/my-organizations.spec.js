import { mount } from '@vue/test-utils'
import MyOrganizations from './my-organizations.vue'
import Vuex from 'vuex'
// Wolle import Vue from 'vue'

const localVue = global.localVue

describe('my-organizations.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    getters = {
      'auth/user': () => {
        return {}
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters,
      })
      return mount(MyOrganizations, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.base-card')).toBe(true)
    })
  })
})
