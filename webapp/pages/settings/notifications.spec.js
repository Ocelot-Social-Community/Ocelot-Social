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
            emailNotificationSettings: {
              commentOnObservedPost: true,
              postByFollowedUser: true,
              postInGroup: true,
              groupMemberJoined: false,
              groupMemberLeft: false,
              groupMemberRemoved: false,
              groupMemberRoleChanged: false,
            },
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
      // TODO snapshot match
    })

    it('activate all button works', async () => {
      await wrapper.find('#activate-all').trigger('click')
      expect(wrapper.vm.emailNotificationSettings).toEqual({
        commentOnObservedPost: true,
        postByFollowedUser: true,
        postInGroup: true,
        groupMemberJoined: true,
        groupMemberLeft: true,
        groupMemberRemoved: true,
        groupMemberRoleChanged: true,
      })
    })

    it('deactivate all button works', async () => {
      await wrapper.find('#deactivate-all').trigger('click')
      expect(wrapper.vm.emailNotificationSettings).toEqual({
        commentOnObservedPost: false,
        postByFollowedUser: false,
        postInGroup: false,
        groupMemberJoined: false,
        groupMemberLeft: false,
        groupMemberRemoved: false,
        groupMemberRoleChanged: false,
      })
    })

    it('clicking on submit with a server error shows a toast and emailSettings stay the same', async () => {
      // TODO
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })
      await wrapper.find('#send-email').setChecked(false)
      await wrapper.find('.base-button').trigger('click')
      expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
      expect(wrapper.vm.notifyByEmail).toBe(true)
    })
  })
})
