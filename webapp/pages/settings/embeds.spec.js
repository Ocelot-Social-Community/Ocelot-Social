import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import Embeds from './embeds.vue'

const localVue = global.localVue

describe('embeds.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn((v) => v),
      $apollo: {
        mutate: jest.fn().mockResolvedValue({}),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
    store = new Vuex.Store({
      getters: {
        'auth/user': () => ({ id: 'u343', name: 'Delete MyAccount', allowEmbedIframes: true }),
      },
      mutations: { 'auth/SET_USER': jest.fn() },
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Embeds, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('os-card')).toBe(true)
    })

    it('head returns title', () => {
      expect(wrapper.vm.$options.head.call(wrapper.vm)).toEqual({
        title: 'settings.embeds.name',
      })
    })

    it('lists the providers the backend reports', async () => {
      // The apollo option is inert without a provider, so drive its update handler directly — that
      // is the whole mapping from the query result to what the page renders.
      wrapper.vm.$options.apollo.embedProviders.update.call(wrapper.vm, {
        embedProviders: [{ name: 'YouTube', url: 'https://youtube.com' }],
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('YouTube')
      expect(wrapper.text()).toContain('https://youtube.com')
    })

    it('sets disabled from currentUser.allowEmbedIframes', () => {
      expect(wrapper.vm.disabled).toBe(true)
    })

    describe('submit success', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate = jest.fn().mockImplementation(({ update }) => {
          if (update) update(null, { data: { UpdateUser: { allowEmbedIframes: false } } })
          return Promise.resolve()
        })
        await wrapper.findAll('button').at(0).trigger('click')
        await wrapper.vm.$nextTick()
      })

      it('toggles disabled state', () => {
        expect(wrapper.vm.disabled).toBe(false)
      })
    })

    describe('submit error', () => {
      beforeEach(async () => {
        mocks.$apollo.mutate = jest.fn().mockRejectedValue(new Error('Network error'))
        await wrapper.findAll('button').at(0).trigger('click')
        await wrapper.vm.$nextTick()
      })

      it('shows error toast', () => {
        expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
      })
    })
  })
})
