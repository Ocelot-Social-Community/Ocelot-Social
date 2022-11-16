import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import Notifications from './notifications.vue'

const localVue = global.localVue

describe('notifications.vue', () => {
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
            sendNotificationEmails: true,
          }
        },
      },
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Notifications, {
        store,
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.base-card')).toBe(true)
    })

    it('clicking on submit changes notifyByEmail to false', async () => {
      wrapper.find('#send-email').trigger('click')
      await wrapper.vm.$nextTick()
      wrapper.find('.base-button').trigger('click')
      expect(wrapper.vm.notifyByEmail).toBe(false)
    })

    it('clicking on submit with a server error shows a toast and notifyByEmail is still true', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      wrapper.find('#send-email').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('.base-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
      expect(wrapper.vm.notifyByEmail).toBe(true)
    })
  })
})
