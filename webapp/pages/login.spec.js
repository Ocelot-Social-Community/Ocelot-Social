import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import login from './login.vue'
import LoginForm from '~/components/LoginForm/LoginForm.vue'

const localVue = global.localVue

const stubs = {
  'client-only': true,
  'nuxt-link': true,
  'router-link': true,
}

const routerPushMock = jest.fn()
const routerReplaceMock = jest.fn()
const i18nSetMock = jest.fn()

describe('Login.vue', () => {
  let store
  let mocks
  let wrapper
  let asyncData
  let tosVersion
  let redirect

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $i18n: {
        locale: () => 'en',
        set: i18nSetMock,
      },
      $route: {
        query: {},
      },
      $router: {
        replace: routerReplaceMock,
        push: routerPushMock,
      },
    }
    asyncData = false
    tosVersion = '0.0.0'
    redirect = jest.fn()
  })

  describe('mount', () => {
    const Wrapper = async () => {
      store = new Vuex.Store({
        getters: {
          'auth/user': () => {
            return { termsAndConditionsAgreedVersion: tosVersion }
          },
        },
      })
      if (asyncData) {
        const data = login.data ? login.data() : {}
        const aData = await login.asyncData({
          store,
          redirect,
        })
        login.data = function () {
          return { ...data, ...aData }
        }
      }
      return mount(login, {
        store,
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders', async () => {
      wrapper = await Wrapper()
      expect(wrapper.findAll('.login-form')).toHaveLength(1)
    })

    it('renders with asyncData and wrong TOS Version', async () => {
      asyncData = true
      wrapper = await Wrapper()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('renders with asyncData and correct TOS Version', async () => {
      asyncData = true
      tosVersion = '0.0.4'
      wrapper = await Wrapper()
      expect(redirect).toHaveBeenCalledWith('/')
    })

    describe('handle succcess', () => {
      beforeEach(async () => {
        asyncData = true
        tosVersion = '0.0.4'
      })

      describe('with route query to invite code', () => {
        beforeEach(async () => {
          mocks.$route.query = {
            inviteCode: 'ABCDEF',
          }
          wrapper = await Wrapper()
          wrapper.findComponent(LoginForm).vm.$emit('success')
        })

        it('calls i18n.set', () => {
          expect(i18nSetMock).toBeCalledWith('en')
        })

        it('call router push to registration page', () => {
          expect(routerPushMock).toBeCalledWith({
            name: 'registration',
            query: {
              inviteCode: 'ABCDEF',
            },
          })
        })
      })

      describe('without route query to invite code', () => {
        beforeEach(async () => {
          mocks.$route.query = {}
          wrapper = await Wrapper()
          wrapper.findComponent(LoginForm).vm.$emit('success')
        })

        it('calls i18n.set', () => {
          expect(i18nSetMock).toBeCalledWith('en')
        })

        it('call router push to registration page', () => {
          expect(routerReplaceMock).toBeCalledWith('/')
        })
      })
    })
  })
})
