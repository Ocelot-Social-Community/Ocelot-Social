import Vuex from 'vuex'
import { shallowMount } from '@vue/test-utils'
import Default from './default.vue'

const localVue = global.localVue
localVue.directive('scrollTo', jest.fn())

const stubs = {
  nuxt: {
    template: '<span><slot /></span>',
  },
  'client-only': {
    template: '<span><slot /></span>',
  },
  'nuxt-link': {
    template: '<span><slot /></span>',
  },
}

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
        'chat/showChat': () => {
          return { showChat: false, roomID: null }
        },
      },
    })
  })

  describe('shallow mount', () => {
    const Wrapper = () => {
      return shallowMount(Default, {
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
      expect(wrapper.classes('layout-default')).toBe(true)
    })
  })
})
