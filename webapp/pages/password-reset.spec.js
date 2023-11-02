import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import PasswordReset from './password-reset.vue'

const localVue = global.localVue

const stubs = {
  'client-only': true,
  'nuxt-child': true,
}

describe('password-reset.vue', () => {
  let wrapper
  let mocks
  let asyncData
  let store
  let redirect
  let isLoggedIn

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
      $i18n: {
        locale: () => 'en',
      },
    }
    asyncData = false
    isLoggedIn = false
    redirect = jest.fn()
  })

  describe('mount', () => {
    const Wrapper = async () => {
      store = new Vuex.Store({
        getters: {
          'auth/isLoggedIn': () => isLoggedIn,
        },
      })
      if (asyncData) {
        const data = PasswordReset.data ? PasswordReset.data() : {}
        const aData = await PasswordReset.asyncData({
          store,
          redirect,
        })
        PasswordReset.data = function () {
          return { ...data, ...aData }
        }
      }
      return mount(PasswordReset, {
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders', async () => {
      wrapper = await Wrapper()
      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('renders with asyncData and not loggedIn', async () => {
      asyncData = true
      wrapper = await Wrapper()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('renders with asyncData and loggedIn', async () => {
      asyncData = true
      isLoggedIn = true
      wrapper = await Wrapper()
      expect(redirect).toHaveBeenCalledWith('/')
    })
  })
})
