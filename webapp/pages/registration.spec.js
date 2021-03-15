import { config, mount } from '@vue/test-utils'
import Registration from './registration.vue'
import Vuex from 'vuex'
import Vue from 'vue'

const localVue = global.localVue

config.stubs['client-only'] = '<span><slot /></span>'
config.stubs['router-link'] = '<span><slot /></span>'
config.stubs['nuxt-link'] = '<span><slot /></span>'
config.stubs['infinite-loading'] = '<span><slot /></span>'

describe('Registration', () => {
  let wrapper
  let Wrapper
  let store
  let mocks
  let mutations

  beforeEach(() => {
    mutations = {
      'posts/SELECT_ORDER': jest.fn(),
    }
    // Wolle what is needed here?
    store = new Vuex.Store({
      getters: {
        'posts/filter': () => ({}),
        'posts/orderOptions': () => () => [
          {
            key: 'store.posts.orderBy.oldest.label',
            label: 'store.posts.orderBy.oldest.label',
            icon: 'sort-amount-asc',
            value: 'createdAt_asc',
          },
          {
            key: 'store.posts.orderBy.newest.label',
            label: 'store.posts.orderBy.newest.label',
            icon: 'sort-amount-desc',
            value: 'createdAt_desc',
          },
        ],
        'posts/selectedOrder': () => () => 'createdAt_desc',
        'posts/orderIcon': () => 'sort-amount-desc',
        'posts/orderBy': () => 'createdAt_desc',
        'auth/user': () => {
          return { id: 'u23' }
        },
      },
      mutations,
    })
    mocks = {
      $t: (key) => key,
      $filters: {
        truncate: (a) => a,
        removeLinks: jest.fn(),
      },
      $i18n: {
        locale: () => 'de',
      },
      // If you are mocking router, than don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
      $router: {
        history: {
          push: jest.fn(),
        },
        push: jest.fn(),
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: jest.fn().mockResolvedValue(),
        queries: {
          Post: {
            refetch: jest.fn(),
            fetchMore: jest.fn().mockResolvedValue([
              {
                id: 'p23',
                name: 'It is a post',
                author: {
                  id: 'u1',
                },
              },
            ]),
          },
        },
      },
      $route: {
        query: {},
      },
      app: {
        $env: {},
      },
    }
  })

  describe('mount', () => {
    Wrapper = () => {
      return mount(Registration, {
        store,
        mocks,
        localVue,
      })
    }

    // Wolle beforeEach(() => {
    //   wrapper = Wrapper()
    // })

    describe('no "PUBLIC_REGISTRATION" and no "INVITE_REGISTRATION"', () => {
      beforeEach(() => {
        mocks.app.$env = {
          PUBLIC_REGISTRATION: false,
          INVITE_REGISTRATION: false,
        }
      })

      it('no "method" query in URI show "RegistrationSlideNoPublic"', () => {
        mocks.$route.query = {}
        wrapper = Wrapper()
        expect(wrapper.find('.hc-empty').exists()).toBe(true)
      })

      describe('"method=invite-mail" in URI show "RegistrationSlideNonce"', () => {
        it('no "email" query in URI', () => {
          mocks.$route.query = { method: 'invite-mail' }
          wrapper = Wrapper()
          expect(wrapper.find('.enter-nonce').exists()).toBe(true)
        })

        describe('"email=user%40example.org" query in URI', () => {
          it('have email displayed', () => {
            mocks.$route.query = { method: 'invite-mail', email: 'user@example.org' }
            wrapper = Wrapper()
            expect(wrapper.find('.enter-nonce').text()).toContain('user@example.org')
          })

          it('"nonce=648bd3" query in URI have nonce in input', async () => {
            mocks.$route.query = {
              method: 'invite-mail',
              email: 'user@example.org',
              nonce: '648bd3',
            }
            wrapper = Wrapper()
            await Vue.nextTick()
            const form = wrapper.find('.enter-nonce')
            expect(form.vm.formData.nonce).toEqual('648bd3')
          })
        })
      })
    })
  })
})
