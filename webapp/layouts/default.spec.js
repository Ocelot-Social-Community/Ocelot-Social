import Vuex from 'vuex'
import { config, shallowMount } from '@vue/test-utils'
import Default from './default.vue'

const localVue = global.localVue
localVue.directive('scrollTo', jest.fn())

config.stubs.nuxt = '<span><slot /></span>'
config.stubs['client-only'] = '<span><slot /></span>'
config.stubs['nuxt-link'] = '<span><slot /></span>'

describe('default.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $route: {
        matched: [{ name: 'index' }],
      },
      $scrollTo: jest.fn(),
      $t: jest.fn(),
      $env: {
        INVITE_REGISTRATION: true,
      },
    }
    store = new Vuex.Store({
      getters: {
        'auth/isLoggedIn': () => true,
      },
    })
  })

  describe('shallow mount', () => {
    const Wrapper = () => {
      return shallowMount(Default, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.layout-default')).toBe(true)
    })
  })
})
