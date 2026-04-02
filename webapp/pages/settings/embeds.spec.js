import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import Embeds from './embeds.vue'
import axios from 'axios'

jest.mock('axios')

const localVue = global.localVue

describe('embeds.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: [{ provider_name: 'YouTube', provider_url: 'https://youtube.com' }],
    })
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

    it('loads providers on mount', () => {
      expect(axios.get).toHaveBeenCalledWith('/api/providers.json')
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
