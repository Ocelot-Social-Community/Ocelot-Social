import { mount, RouterLinkStub } from '@vue/test-utils'
import NotificationMenu from './NotificationMenu'
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import { markAsReadMutation, markAsUnreadMutation } from '~/graphql/User'

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

        it('refetches all active Notifications queries so the counter updates', async () => {
          wrapper = Wrapper()
          wrapper.findComponent(NotificationsTable).vm.$emit('toggleNotificationRead', {
            resourceId: 'post-1',
            read: false,
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({ refetchQueries: ['Notifications'] }),
          )
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
    })
  })
})
