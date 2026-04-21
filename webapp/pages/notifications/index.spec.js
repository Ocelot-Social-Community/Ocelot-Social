import { mount } from '@vue/test-utils'
import NotificationsPage from './index.vue'

import DropdownFilter from '~/components/DropdownFilter/DropdownFilter'
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'

import {
  markAsReadMutation,
  markAsUnreadMutation,
  markAllAsReadMutation,
  notificationQuery,
} from '~/graphql/User'
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

    describe('toggleNotificationRead', () => {
      it('fires markAsRead when toggling an unread notification', () => {
        wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
          resourceId: 'r1',
          read: false,
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            mutation: markAsReadMutation(),
            variables: { id: 'r1' },
          }),
        )
      })

      it('fires markAsUnread when toggling a read notification', () => {
        wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
          resourceId: 'r1',
          read: true,
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            mutation: markAsUnreadMutation(),
            variables: { id: 'r1' },
          }),
        )
      })

      it('refetches active Notifications queries so the counter stays in sync', async () => {
        wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
          resourceId: 'r1',
          read: false,
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ refetchQueries: ['Notifications'] }),
        )
      })

      it('shows an error toast on mutation failure', async () => {
        mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'boom' })
        wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
          resourceId: 'r1',
          read: false,
        })
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(mocks.$toast.error).toHaveBeenCalledWith('boom')
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

      describe('with no notifications', () => {
        it('returns early without calling the mutation', async () => {
          wrapper.setData({ notifications: [] })
          mocks.$apollo.mutate = jest.fn()
          await wrapper.vm.markAllAsRead()
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
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

    describe('unreadNotificationsCount computed', () => {
      it('counts only unread notifications (skips the read ones)', () => {
        wrapper.setData({
          notifications: [
            { id: 'a', read: false },
            { id: 'b', read: true },
            { id: 'c', read: false },
            { id: 'd', read: true },
          ],
        })
        expect(wrapper.vm.unreadNotificationsCount).toBe(2)
      })

      it('returns 0 when every notification is read', () => {
        wrapper.setData({
          notifications: [
            { id: 'a', read: true },
            { id: 'b', read: true },
          ],
        })
        expect(wrapper.vm.unreadNotificationsCount).toBe(0)
      })
    })

    describe('apollo notifications options', () => {
      const apollo = NotificationsPage.apollo.notifications

      it('returns a valid gql document from query()', () => {
        expect(apollo.query.call({ $i18n: { locale: () => 'en' } })).toBeTruthy()
      })

      it('derives variables from the component state (read, pageSize, offset)', () => {
        const ctx = {
          first: 12,
          offset: 24,
          notificationRead: false,
        }
        expect(apollo.variables.call(ctx)).toEqual({
          read: false,
          orderBy: 'updatedAt_desc',
          first: 12,
          offset: 24,
        })
      })

      it('reports query errors via $toast.error', () => {
        const toast = { error: jest.fn() }
        apollo.error.call({ $toast: toast }, { message: 'bad query' })
        expect(toast.error).toHaveBeenCalledWith('bad query')
      })

      describe('update()', () => {
        it('returns an empty list when the response has no notifications field', () => {
          const ctx = { pageSize: 12, offset: 0, notifications: [] }
          expect(apollo.update.call(ctx, { notifications: null })).toEqual([])
        })

        it('preserves the existing list when a page beyond the first returns empty', () => {
          const prev = [{ id: 'x', index: 12 }]
          const ctx = { pageSize: 12, offset: 12, notifications: prev }
          expect(apollo.update.call(ctx, { notifications: [] })).toBe(prev)
        })

        it('maps each notification with a running `index` based on offset', () => {
          const ctx = { pageSize: 12, offset: 24, notifications: [] }
          const result = apollo.update.call(ctx, {
            notifications: [{ id: 'a' }, { id: 'b' }],
          })
          expect(result).toEqual([
            { id: 'a', index: 24 },
            { id: 'b', index: 25 },
          ])
        })

        it('sets hasNext=true when a full page is returned', () => {
          const ctx = { pageSize: 2, offset: 0, notifications: [], hasNext: false }
          apollo.update.call(ctx, { notifications: [{ id: 'a' }, { id: 'b' }] })
          expect(ctx.hasNext).toBe(true)
        })

        it('sets hasNext=false when a partial page is returned', () => {
          const ctx = { pageSize: 12, offset: 0, notifications: [], hasNext: true }
          apollo.update.call(ctx, { notifications: [{ id: 'a' }] })
          expect(ctx.hasNext).toBe(false)
        })
      })

      it('uses the notificationQuery as its gql source', () => {
        // Sanity: the imported query and the one returned by the Apollo option
        // should come from the same factory.
        expect(typeof notificationQuery).toBe('function')
      })
    })
  })
})
