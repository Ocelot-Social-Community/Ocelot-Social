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
      $apollo: {
        mutate: jest.fn(),
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
    }
    store = new Vuex.Store({
      getters: {
        'auth/user': () => {
          return {
            id: 'u343',
            name: 'MyAccount',
            showShoutsPublicly: true,
          }
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
      expect(wrapper.classes('base-card')).toBe(true)
    })

    it('clicking on submit changes shoutsAllowed to false', async () => {
      await wrapper.find('#allow-shouts').setChecked(false)
      await wrapper.find('.base-button').trigger('click')
      expect(wrapper.vm.shoutsAllowed).toBe(false)
    })

    it('clicking on submit with a server error shows a toast and shoutsAllowed is still true', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      await wrapper.find('#allow-shouts').setChecked(false)
      await wrapper.find('.base-button').trigger('click')
      expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
      expect(wrapper.vm.shoutsAllowed).toBe(true)
    })
  })
})
