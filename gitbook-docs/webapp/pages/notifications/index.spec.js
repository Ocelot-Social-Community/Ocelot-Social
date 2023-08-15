import { mount } from '@vue/test-utils'
import NotificationsPage from './index.vue'

import DropdownFilter from '~/components/DropdownFilter/DropdownFilter'
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'

import { markAsReadMutation, markAllAsReadMutation } from '~/graphql/User'
const localVue = global.localVue

const stubs = {
  'client-only': true,
  'notifications-table': true,
}

describe('PostIndex', () => {
  let wrapper, Wrapper, mocks

  beforeEach(() => {
    mocks = {
      $t: (string) => string,
      $toast: {
        error: jest.fn((string) => string),
      },
      $i18n: {
        locale: () => 'en',
      },
      $apollo: {
        mutate: jest.fn().mockResolvedValueOnce({
          data: { markAsRead: { id: 'notificationSourceId', read: true } },
        }),
        queries: {
          notifications: {
            refresh: jest.fn().mockResolvedValueOnce(),
          },
        },
      },
    }
  })

  describe('mount', () => {
    jest.clearAllMocks()
    beforeEach(() => {
      Wrapper = () => {
        return mount(NotificationsPage, {
          mocks,
          localVue,
          stubs,
        })
      }
      wrapper = Wrapper()
      wrapper.setData({
        notifications: [
          {
            id: 'mentioned_in_comment/c4-1/u1',
            read: false,
            reason: 'mentioned_in_comment',
            createdAt: '2023-03-06T14:32:47.924Z',
            updatedAt: '2023-03-06T14:32:47.924Z',
          },
          {
            id: 'mentioned_in_post/p8/u1',
            read: false,
            reason: 'mentioned_in_post',
            createdAt: '2023-03-06T14:32:47.667Z',
            updatedAt: '2023-03-06T14:32:47.667Z',
          },
        ],
      })
    })

    it('renders a Notications header', () => {
      expect(wrapper.find('.ds-heading').exists()).toBe(true)
    })

    it('renders a `dropdown-filter` component', () => {
      expect(wrapper.find('.dropdown-filter').exists()).toBe(true)
    })

    it('renders a `notifications-table` component', () => {
      expect(wrapper.findComponent(NotificationsTable).exists()).toBe(true)
    })

    it('renders a `mark-all-as-read` button', () => {
      expect(wrapper.find('[data-test="markAllAsRead-button"]').exists()).toBe(true)
    })

    describe('filter', () => {
      it('has "All" as default', () => {
        expect(wrapper.find('a.dropdown-filter').text()).toBe('notifications.filterLabel.all')
      })

      describe('select Read', () => {
        beforeEach(() => {
          wrapper.findComponent(DropdownFilter).vm.$emit('filter', wrapper.vm.filterOptions[1])
        })

        it('sets `notificationRead` to value of received option', () => {
          expect(wrapper.vm.notificationRead).toEqual(wrapper.vm.filterOptions[1].value)
        })

        it('sets label to the label of the received option', () => {
          expect(wrapper.vm.selected).toEqual(wrapper.vm.filterOptions[1].label)
        })

        it('refreshes the notifications', () => {
          expect(mocks.$apollo.queries.notifications.refresh).toHaveBeenCalledTimes(1)
        })
      })
    })

    describe('markNotificationAsRead', () => {
      beforeEach(() => {
        wrapper
          .findComponent(NotificationsTable)
          .vm.$emit('markNotificationAsRead', 'notificationSourceId')
      })

      it('calls markAllAsRead mutation', () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: markAsReadMutation(),
          variables: { id: 'notificationSourceId' },
        })
      })

      describe('error handling', () => {
        beforeEach(() => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'Some error message' })
          wrapper
            .findComponent(NotificationsTable)
            .vm.$emit('markNotificationAsRead', 'notificationSourceId')
        })

        it('shows an error message if there is an error', () => {
          expect(mocks.$toast.error).toHaveBeenCalledWith('Some error message')
        })
      })
    })

    describe('markAllNotificationAsRead', () => {
      it('calls markAllNotificationAsRead mutation and refreshes notification', async () => {
        wrapper.find('button[data-test="markAllAsRead-button"]').trigger('click')
        await expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
          mutation: markAllAsReadMutation(),
        })
        expect(mocks.$apollo.queries.notifications.refresh).toHaveBeenCalledTimes(1)
      })

      describe('error handling', () => {
        it('shows an error message if there is an error', async () => {
          mocks.$apollo.mutate = jest
            .fn()
            .mockRejectedValueOnce({ message: 'Another error message' })
          await wrapper.find('button[data-test="markAllAsRead-button"]').trigger('click')
          expect(mocks.$toast.error).toHaveBeenCalledWith('Another error message')
        })
      })
    })

    describe('PaginationButtons', () => {
      beforeEach(() => {
        wrapper = Wrapper()
      })

      describe('next: given a user is on the first page', () => {
        it('adds offset to pageSize to skip first x notifications and display next page', () => {
          wrapper.findComponent(PaginationButtons).vm.$emit('next')
          expect(wrapper.vm.offset).toEqual(12)
        })
      })

      describe('back: given a user is on the third page', () => {
        it('sets offset when back is emitted', () => {
          wrapper.setData({ offset: 24 })
          wrapper.findComponent(PaginationButtons).vm.$emit('back')
          expect(wrapper.vm.offset).toEqual(12)
        })
      })
    })
  })
})
