import Vuex from 'vuex'
import { shallowMount } from '@vue/test-utils'
import Basic from './basic.vue'

const localVue = global.localVue

const stubs = {
  nuxt: {
    template: '<span><slot /></span>',
  },
}

describe('basic.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    store = new Vuex.Store({
      getters: {
        'auth/isLoggedIn': () => true,
      },
    })
  })

  describe('shallow mount', () => {
    const Wrapper = () => {
      return shallowMount(Basic, {
        store,
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
