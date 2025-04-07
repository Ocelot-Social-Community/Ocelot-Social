import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import { render, fireEvent, screen } from '@testing-library/vue'
import Notifications from './notifications.vue'

const localVue = global.localVue

describe('notifications.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn((v) => v),
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
            emailNotificationSettings: [
              {
                type: 'post',
                settings: [
                  {
                    name: 'commentOnObservedPost',
                    value: true,
                  },
                  {
                    name: 'mention',
                    value: false,
                  },
                ],
              },
              {
                type: 'group',
                settings: [
                  {
                    name: 'groupMemberJoined',
                    value: true,
                  },
                  {
                    name: 'groupMemberLeft',
                    value: true,
                  },
                  {
                    name: 'groupMemberRemoved',
                    value: false,
                  },
                  {
                    name: 'groupMemberRoleChanged',
                    value: true,
                  },
                ],
              },
            ],
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
      expect(wrapper.element).toMatchSnapshot()
    })
  })

  describe('Notifications', () => {
    beforeEach(() => {
      render(Notifications, {
        store,
        mocks,
        localVue,
      })
    })

    it('check all button works', async () => {
      const button = screen.getByText('settings.notifications.checkAll')
      await fireEvent.click(button)

      const checkboxes = screen.getAllByRole('checkbox')
      for (const checkbox of checkboxes) {
        expect(checkbox.checked).toEqual(true)
      }

      // Check that the button is disabled
      expect(button.disabled).toBe(true)
    })

    it('uncheck all button works', async () => {
      const button = screen.getByText('settings.notifications.uncheckAll')
      await fireEvent.click(button)

      const checkboxes = screen.getAllByRole('checkbox')
      for (const checkbox of checkboxes) {
        expect(checkbox.checked).toEqual(false)
      }

      // Check that the button is disabled
      expect(button.disabled).toBe(true)
    })

    it('clicking on submit with a server error shows a toast', async () => {
      mocks.$apollo.mutate = jest.fn().mockRejectedValue({ message: 'Ouch!' })

      // Change some value to enable save button
      const checkbox = screen.getAllByRole('checkbox')[0]
      await fireEvent.click(checkbox)

      // Click save button
      const button = screen.getByText('actions.save')
      await fireEvent.click(button)

      expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
    })
  })
})
