import Vuex from 'vuex'
import { config, mount } from '@vue/test-utils'
import PasswordReset from './password-reset.vue'

const localVue = global.localVue

config.stubs['client-only'] = '<span class="client-only"><slot /></span>'
config.stubs['nuxt-child'] = '<span class="nuxt-child"><slot /></span>'

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
      })
    }

    it('renders', async () => {
      wrapper = await Wrapper()
      expect(wrapper.is('div')).toBe(true)
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
      expect(redirect).toBeCalledWith('/')
    })
  })
})
