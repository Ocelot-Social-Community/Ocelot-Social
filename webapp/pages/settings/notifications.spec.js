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
      expect(wrapper.classes('base-card')).toBe(true)
    })

    it('clicking on submit changes notifyByEmail to false', async () => {
      await wrapper.find('#send-email').setChecked(false)
      await wrapper.find('.base-button').trigger('click')
      expect(wrapper.vm.notifyByEmail).toBe(false)
    })

    it('clicking on submit with a server error shows a toast and notifyByEmail is still true', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      await wrapper.find('#send-email').setChecked(false)
      await wrapper.find('.base-button').trigger('click')
      expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
      expect(wrapper.vm.notifyByEmail).toBe(true)
    })
  })
})
