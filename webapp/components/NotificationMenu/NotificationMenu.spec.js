import { mount, RouterLinkStub } from '@vue/test-utils'
import NotificationMenu from './NotificationMenu'
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import { markAsReadMutation, markAsUnreadMutation, markAllAsReadMutation } from '~/graphql/User'

const localVue = global.localVue

localVue.filter('truncate', (string) => string)

describe('NotificationMenu.vue', () => {
  let wrapper
  let mocks
  let data
  let stubs
  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    data = () => {
      return {
        notifications: [],
      }
    }
    stubs = {
      NuxtLink: RouterLinkStub,
      UserTeaser: true,
      'client-only': true,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(NotificationMenu, {
        data,
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders as link without counter', () => {
      wrapper = Wrapper()
      expect(wrapper.classes('notifications-menu')).toBe(true)
      expect(wrapper.find('.os-counter-icon__count').exists()).toBe(false)
    })

    it('no dropdown is rendered', () => {
      wrapper = Wrapper()
      expect(wrapper.find('.dropdown').exists()).toBe(false)
    })

    describe('given only read notifications', () => {
      beforeEach(() => {
        data = () => {
          return {
            notifications: [
              {
                id: 'notification-41',
                read: true,
                post: {
                  id: 'post-1',
                  title: 'some post title',
                  contentExcerpt: 'this is a post content',
                  author: {
                    id: 'john-1',
                    slug: 'john-doe',
                    name: 'John Doe',
                  },
                },
              },
            ],
          }
        }
      })

      it('renders as link without counter', () => {
        wrapper = Wrapper()
        expect(wrapper.classes('notifications-menu')).toBe(true)
        expect(wrapper.find('.os-counter-icon__count').exists()).toBe(false)
      })

      it('no dropdown is rendered', () => {
        wrapper = Wrapper()
        expect(wrapper.find('.dropdown').exists()).toBe(false)
      })
    })

    describe('given some notifications', () => {
      beforeEach(() => {
        data = () => {
          return {
            notifications: [
              {
                id: 'notification-41',
                read: false,
                post: {
                  id: 'post-1',
                  title: 'some post title',
                  contentExcerpt: 'this is a post content',
                  author: {
                    id: 'john-1',
                    slug: 'john-doe',
                    name: 'John Doe',
                  },
                },
                from: {
                  title: 'Title',
                  author: {
                    id: 'reporter',
                    slug: 'reporter',
                    name: 'reporter',
                  },
                },
              },
              {
                id: 'notification-42',
                read: false,
                post: {
                  id: 'post-2',
                  title: 'another post title',
                  contentExcerpt: 'this is yet another post content',
                  author: {
                    id: 'john-1',
                    slug: 'john-doe',
                    name: 'John Doe',
                  },
                },
                from: {
                  title: 'Title',
                  author: {
                    id: 'reporter',
                    slug: 'reporter',
                    name: 'reporter',
                  },
                },
              },
              {
                id: 'notification-43',
                read: true,
                post: {
                  id: 'post-3',
                  title: 'read post title',
                  contentExcerpt: 'this is yet another post content',
                  author: {
                    id: 'john-1',
                    slug: 'john-doe',
                    name: 'John Doe',
                  },
                },
                from: {
                  title: 'Title',
                  author: {
                    id: 'reporter',
                    slug: 'reporter',
                    name: 'reporter',
                  },
                },
              },
            ],
          }
        }
      })

      it('displays the number of unread notifications', () => {
        wrapper = Wrapper()
        expect(wrapper.find('.os-counter-icon__count').text()).toEqual('2')
      })

      it('renders the counter in red', () => {
        wrapper = Wrapper()
        expect(wrapper.find('.os-counter-icon__count').classes()).toContain(
          'os-counter-icon__count--danger',
        )
      })

      describe('toggleNotificationRead wiring', () => {
        beforeEach(() => {
          mocks.$i18n = { locale: () => 'en' }
          mocks.$toast = { error: jest.fn() }
          mocks.$apollo = {
            mutate: jest.fn().mockResolvedValue({}),
            queries: { notifications: { refetch: jest.fn() } },
          }
        })

        it('fires markAsRead when the toggle emits with read=false', async () => {
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-1',
            read: false,
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              mutation: markAsReadMutation(mocks.$i18n),
              variables: { id: 'post-1' },
            }),
          )
        })

        it('fires markAsUnread when the toggle emits with read=true', async () => {
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-3',
            read: true,
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
              mutation: markAsUnreadMutation(mocks.$i18n),
              variables: { id: 'post-3' },
            }),
          )
        })

        it('does not refetch immediately (grace period for undo)', async () => {
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-1',
            read: false,
          })
          await wrapper.vm.$nextTick()
          await wrapper.vm.$nextTick()
          expect(mocks.$apollo.queries.notifications.refetch).not.toHaveBeenCalled()
        })

        it('refetches after the grace period', async () => {
          jest.useFakeTimers()
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-1',
            read: false,
          })
          await wrapper.vm.$nextTick()
          await wrapper.vm.$nextTick()
          jest.advanceTimersByTime(3000)
          expect(mocks.$apollo.queries.notifications.refetch).toHaveBeenCalled()
          jest.useRealTimers()
        })

        it('debounces rapid toggles into a single refetch', async () => {
          jest.useFakeTimers()
          wrapper = Wrapper()
          const table = wrapper.findComponent(NotificationsTable)
          table.vm.$emit('toggleNotificationRead', { resourceId: 'post-1', read: false })
          await wrapper.vm.$nextTick()
          await wrapper.vm.$nextTick()
          jest.advanceTimersByTime(1500)
          table.vm.$emit('toggleNotificationRead', { resourceId: 'post-1', read: true })
          await wrapper.vm.$nextTick()
          await wrapper.vm.$nextTick()
          jest.advanceTimersByTime(1500)
          expect(mocks.$apollo.queries.notifications.refetch).not.toHaveBeenCalled()
          jest.advanceTimersByTime(1500)
          expect(mocks.$apollo.queries.notifications.refetch).toHaveBeenCalledTimes(1)
          jest.useRealTimers()
        })

        it('shows an error toast when the mutation fails', async () => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'boom' })
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-1',
            read: false,
          })
          await wrapper.vm.$nextTick()
          await wrapper.vm.$nextTick()
          expect(mocks.$toast.error).toHaveBeenCalledWith('boom')
        })
      })

      describe('handleResize', () => {
        it('closes the dropdown menu when triggered', () => {
          wrapper = Wrapper()
          const closeMenu = jest.fn()
          wrapper.vm.$refs.dropdown = { closeMenu }
          wrapper.vm.handleResize()
          expect(closeMenu).toHaveBeenCalled()
        })

        it('is a no-op when the dropdown ref is missing', () => {
          wrapper = Wrapper()
          wrapper.vm.$refs = {}
          expect(() => wrapper.vm.handleResize()).not.toThrow()
        })
      })

      describe('beforeDestroy', () => {
        it('removes the resize listener and clears any pending refetch timer', () => {
          const removeSpy = jest.spyOn(window, 'removeEventListener')
          const clearSpy = jest.spyOn(global, 'clearTimeout')
          wrapper = Wrapper()
          const { handleResize } = wrapper.vm
          wrapper.destroy()
          expect(removeSpy).toHaveBeenCalledWith('resize', handleResize)
          expect(clearSpy).toHaveBeenCalled()
          removeSpy.mockRestore()
          clearSpy.mockRestore()
        })
      })

      describe('markAsReadAndCloseMenu', () => {
        beforeEach(() => {
          mocks.$i18n = { locale: () => 'en' }
          mocks.$toast = { error: jest.fn() }
          mocks.$apollo = { mutate: jest.fn().mockResolvedValue({}) }
        })

        it('fires markAsRead and calls the provided closeMenu', async () => {
          wrapper = Wrapper()
          const closeMenu = jest.fn()
          await wrapper.vm.markAsReadAndCloseMenu('n1', closeMenu)
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: markAsReadMutation(mocks.$i18n),
            variables: { id: 'n1' },
          })
          expect(closeMenu).toHaveBeenCalled()
        })

        it('tolerates a missing closeMenu callback', async () => {
          wrapper = Wrapper()
          await expect(wrapper.vm.markAsReadAndCloseMenu('n1')).resolves.toBeUndefined()
        })

        it('shows an error toast when the mutation fails', async () => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'nope' })
          wrapper = Wrapper()
          const closeMenu = jest.fn()
          await wrapper.vm.markAsReadAndCloseMenu('n1', closeMenu)
          expect(mocks.$toast.error).toHaveBeenCalledWith('nope')
          expect(closeMenu).not.toHaveBeenCalled()
        })
      })

      describe('markAllAsRead', () => {
        beforeEach(() => {
          mocks.$i18n = { locale: () => 'en' }
          mocks.$toast = { error: jest.fn() }
          mocks.$apollo = { mutate: jest.fn().mockResolvedValue({}) }
        })

        it('is a no-op when there are no notifications', async () => {
          data = () => ({ notifications: [] })
          wrapper = Wrapper()
          await wrapper.vm.markAllAsRead()
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })

        it('fires the markAllAsRead mutation on the happy path', async () => {
          wrapper = Wrapper()
          await wrapper.vm.markAllAsRead()
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
            mutation: markAllAsReadMutation(mocks.$i18n),
          })
        })

        it('shows an error toast on mutation failure', async () => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'bang' })
          wrapper = Wrapper()
          await wrapper.vm.markAllAsRead()
          expect(mocks.$toast.error).toHaveBeenCalledWith('bang')
        })
      })

      describe('hasNotifications computed', () => {
        it('is truthy when notifications exist', () => {
          wrapper = Wrapper()
          expect(wrapper.vm.hasNotifications).toBeTruthy()
        })

        it('is falsy when the list is empty', () => {
          data = () => ({ notifications: [] })
          wrapper = Wrapper()
          expect(wrapper.vm.hasNotifications).toBeFalsy()
        })
      })
    })

    describe('apollo notifications options', () => {
      const apollo = NotificationMenu.apollo.notifications

      it('returns a valid gql document from query()', () => {
        expect(apollo.query()).toBeTruthy()
      })

      it('returns the expected variables (read:false, updatedAt_desc)', () => {
        expect(apollo.variables()).toEqual({ read: false, orderBy: 'updatedAt_desc' })
      })

      it('reports query errors via $toast.error', () => {
        const toast = { error: jest.fn() }
        apollo.error.call({ $toast: toast }, { message: 'query broke' })
        expect(toast.error).toHaveBeenCalledWith('query broke')
      })

      describe('subscribeToMore.updateQuery', () => {
        const newer = { id: 'n2', updatedAt: '2026-04-01T12:00:00Z' }
        const older = { id: 'n1', updatedAt: '2026-03-01T12:00:00Z' }

        it('merges a new notification into the existing list, newest first', () => {
          const result = apollo.subscribeToMore.updateQuery(
            { notifications: [older] },
            { subscriptionData: { data: { notificationAdded: newer } } },
          )
          expect(result.notifications.map((n) => n.id)).toEqual(['n2', 'n1'])
        })

        it('deduplicates by id if the subscription re-delivers a known notification', () => {
          const result = apollo.subscribeToMore.updateQuery(
            { notifications: [newer, older] },
            { subscriptionData: { data: { notificationAdded: newer } } },
          )
          expect(result.notifications).toHaveLength(2)
        })

        it('handles an empty previous result', () => {
          const result = apollo.subscribeToMore.updateQuery(undefined, {
            subscriptionData: { data: { notificationAdded: newer } },
          })
          expect(result.notifications).toEqual([newer])
        })
      })
    })
  })
})
