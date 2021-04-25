import { config, mount } from '@vue/test-utils'
import Vuex from 'vuex'
import login from './login.vue'

const localVue = global.localVue

config.stubs['client-only'] = '<span class="client-only"><slot /></span>'
config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('Login.vue', () => {
  let mutations
  let store
  let mocks
  let wrapper

  beforeEach(() => {
    mutations = {
      // 'posts/SELECT_ORDER': jest.fn(),
    }
    store = new Vuex.Store({
      getters: {
        /* 'posts/filter': () => ({}),
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
        }, */
      },
      mutations,
    })
    mocks = {
      $t: jest.fn(),
      $i18n: {
        locale: () => 'en',
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(login, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.login-form')).toHaveLength(1)
    })
  })
})
