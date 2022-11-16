import Vuex from 'vuex'
import { config, shallowMount } from '@vue/test-utils'
import Basic from './basic.vue'

const localVue = global.localVue

config.stubs.nuxt = '<span><slot /></span>'

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
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.layout-blank')).toBe(true)
    })
  })
})
