import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import Privacy from './privacy.vue'

const localVue = global.localVue

describe('privacy.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    store = new Vuex.Store({
      getters: {
        'auth/user': () => {
          return { id: 'u343', name: 'Delete MyAccount', showShoutsPublicly: true }
        },
      },
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Privacy, {
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
