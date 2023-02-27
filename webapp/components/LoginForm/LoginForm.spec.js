import Vue from 'vue'
import LoginForm from './LoginForm.vue'
import Styleguide from '@human-connection/styleguide'
import Vuex from 'vuex'
import { mount, createLocalVue } from '@vue/test-utils'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(Styleguide)

const stubs = {
  'nuxt-link': true,
  'locale-switch': true,
  'client-only': true,
}

const authUserMock = jest.fn().mockReturnValue({ activeCategories: [] })

describe('LoginForm', () => {
  let mocks
  let propsData
  let storeMocks

  beforeEach(() => {
    propsData = {}
  })

  describe('mount', () => {
    const Wrapper = () => {
      storeMocks = {
        getters: {
          'auth/pending': () => false,
          'auth/user': authUserMock,
        },
        actions: {
          'auth/login': jest.fn(),
        },
        mutations: {
          'posts/TOGGLE_CATEGORY': jest.fn(),
          'posts/RESET_CATEGORIES': jest.fn(),
        },
      }
      const store = new Vuex.Store(storeMocks)
      mocks = {
        $t: () => {},
        $toast: {
          success: jest.fn(),
          error: jest.fn(),
        },
      }
      return mount(LoginForm, { mocks, localVue, propsData, store, stubs })
    }

    describe('fill in email and password and submit', () => {
      const fillIn = async (wrapper, opts = {}) => {
        const { email = 'email@example.org', password = '1234' } = opts
        wrapper.find('input[name="email"]').setValue(email)
        wrapper.find('input[name="password"]').setValue(password)
        await wrapper.find('form').trigger('submit')
      }

      it('dispatches login with form data', async () => {
        await fillIn(Wrapper())
        expect(storeMocks.actions['auth/login']).toHaveBeenCalledWith(expect.any(Object), {
          email: 'email@example.org',
          password: '1234',
        })
      })

      describe('setting saved categories', () => {
        beforeEach(() => {
          jest.clearAllMocks()
        })

        describe('no categories saved', () => {
          it('resets the categories', async () => {
            await fillIn(Wrapper())
            expect(storeMocks.mutations['posts/RESET_CATEGORIES']).toBeCalled()
            expect(storeMocks.mutations['posts/TOGGLE_CATEGORY']).not.toBeCalled()
          })
        })

        describe('categories saved', () => {
          it('sets the categories', async () => {
            authUserMock.mockReturnValue({ activeCategories: ['cat1', 'cat9', 'cat12'] })
            await fillIn(Wrapper())
            expect(storeMocks.mutations['posts/RESET_CATEGORIES']).toBeCalled()
            expect(storeMocks.mutations['posts/TOGGLE_CATEGORY']).toBeCalledTimes(3)
            expect(storeMocks.mutations['posts/TOGGLE_CATEGORY']).toBeCalledWith({}, 'cat1')
            expect(storeMocks.mutations['posts/TOGGLE_CATEGORY']).toBeCalledWith({}, 'cat9')
            expect(storeMocks.mutations['posts/TOGGLE_CATEGORY']).toBeCalledWith({}, 'cat12')
          })
        })
      })
    })

    describe('Visibility of password', () => {
      const wrapper = Wrapper()
      it('does not show the password by default', () => {
        expect(wrapper.find('input[name ="password"]').attributes('type')).toEqual('password')
      })

      it('shows the password after click on show password', async () => {
        wrapper.find('span.click-wrapper').trigger('click')
        await Vue.nextTick()
        await expect(wrapper.find('input[name = "password"]').attributes('type')).toEqual('text')
      })
    })

    describe('Click on show password icon, icon change', () => {
      const wrapper = Wrapper()
      it('shows eye icon by default', () => {
        expect(wrapper.find('span.icon-wrapper').attributes('data-test')).toEqual('eye')
      })

      it('shows the slash-eye icon after click', async () => {
        wrapper.find('span.click-wrapper').trigger('click')
        await Vue.nextTick()
        await expect(wrapper.find('span.icon-wrapper').attributes('data-test')).toEqual('eye-slash')
      })
    })

    describe('Focus on password input container after show-password click', () => {
      const wrapper = Wrapper()
      const componentToGetFocus = wrapper.find('input[name ="password"]')
      it('Focuses on the password field after click', async () => {
        wrapper.find('span.click-wrapper').trigger('click', {
          relateTarget: componentToGetFocus,
        })
        await Vue.nextTick()
        await expect(wrapper.emitted('focus')).toBeTruthy()
      })
    })
  })
})
