import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import DeleteAccount from './delete-account.vue'

const localVue = global.localVue

describe('delete-account.vue', () => {
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
          return { id: 'u343', name: 'Delete MyAccount' }
        },
      },
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(DeleteAccount, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('base-card')).toBe(true)
    })
  })
})
