import { mount, RouterLinkStub } from '@vue/test-utils'

import Vuex from 'vuex'
import NotificationsTable from './NotificationsTable'

import { notifications } from '~/components/utils/Notifications'
const localVue = global.localVue

localVue.filter('truncate', (string) => string)

describe('NotificationsTable.vue', () => {
  let wrapper, mocks, propsData, stubs
  let postNotification, commentNotification

  beforeEach(() => {
    mocks = {
      $t: jest.fn((string) => string),
    }
    stubs = {
      NuxtLink: RouterLinkStub,
      'client-only': true,
    }
    propsData = {}
    // Deep-clone per test so in-test mutations (`postNotification.read = ...`)
    // never leak into the shared module-level fixture.
    postNotification = JSON.parse(JSON.stringify(notifications[0]))
    commentNotification = JSON.parse(JSON.stringify(notifications[1]))
  })

  describe('mount', () => {
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters: {
          'auth/isModerator': () => false,
          'auth/user': () => {
            return {}
          },
        },
      })
      return mount(NotificationsTable, {
        propsData,
        mocks,
        localVue,
        store,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    describe('no notifications', () => {
      it('renders HcEmpty component', () => {
        expect(wrapper.find('.hc-empty').exists()).toBe(true)
      })
    })

    describe('given notifications', () => {
      beforeEach(() => {
        propsData.notifications = [postNotification, commentNotification]
        wrapper = Wrapper()
      })

      it('renders a grid table', () => {
        expect(wrapper.find('.notification-grid').exists()).toBe(true)
      })

      describe('renders 2 columns', () => {
        it('for user', () => {
          expect(wrapper.vm.fields.user).toBeTruthy()
        })

        it('for post', () => {
          expect(wrapper.vm.fields.post).toBeTruthy()
        })
      })

      describe('Post', () => {
        let firstRowNotification
        beforeEach(() => {
          firstRowNotification = wrapper.findAll('.notification-grid-row').at(0)
        })

        it('renders the author', () => {
          const userinfo = firstRowNotification.find('.user-teaser .info')
          expect(userinfo.text()).toContain(postNotification.from.author.name)
        })

        it('renders the reason for the notification', () => {
          const dsTexts = firstRowNotification.findAll('.info span')
          const reason = dsTexts.filter((element) =>
            element.text().startsWith('notifications.reason.mentioned_in_post'),
          )
          expect(reason.exists()).toBe(true)
        })

        it('renders a link to the Post', () => {
          const postLink = firstRowNotification.find('a.notification-mention-post')
          expect(postLink.text()).toEqual(postNotification.from.title)
        })

        it("renders the Post's content", () => {
          const boldTags = firstRowNotification.findAll('p')
          const content = boldTags.filter(
            (element) => element.text() === postNotification.from.content,
          )
          expect(content.exists()).toBe(true)
        })
      })

      describe('Comment', () => {
        let secondRowNotification
        beforeEach(() => {
          secondRowNotification = wrapper.findAll('.notification-grid-row').at(1)
        })

        it('renders the author', () => {
          const userinfo = secondRowNotification.find('.user-teaser .info')
          expect(userinfo.text()).toContain(commentNotification.from.author.name)
        })

        it('renders the reason for the notification', () => {
          const dsTexts = secondRowNotification.findAll('.info span')
          const reason = dsTexts.filter((element) =>
            element.text().startsWith('notifications.reason.mentioned_in_comment'),
          )
          expect(reason.exists()).toBe(true)
        })

        it('renders a link to the Post', () => {
          const postLink = secondRowNotification.find('a.notification-mention-post')
          expect(postLink.text()).toEqual(commentNotification.from.post.title)
        })

        it("renders the Post's content", () => {
          const boldTags = secondRowNotification.findAll('p')
          const content = boldTags.filter(
            (element) => element.text() === commentNotification.from.content,
          )
          expect(content.exists()).toBe(true)
        })
      })

      describe('fallback to descriptionExcerpt when content is empty', () => {
        it('renders descriptionExcerpt if content is missing', () => {
          const fallbackNotification = {
            read: false,
            reason: 'mentioned_in_post',
            from: {
              __typename: 'Post',
              id: 'post-fallback',
              title: 'fallback post',
              slug: 'fallback-post',
              content: '',
              descriptionExcerpt: 'fallback description text',
              author: { id: 'u1', slug: 'user', name: 'User' },
            },
          }
          propsData.notifications = [fallbackNotification]
          wrapper = Wrapper()
          const description = wrapper.find('.notification-description')
          expect(description.text()).toBe('fallback description text')
        })
      })

      describe('description truncation', () => {
        // word-based content so trunc-html cuts at a word boundary near the
        // configured limit (120 for posts, 180 for comments). A single long
        // token would collapse to "…" and hide the limit difference.
        const longContent = 'word '.repeat(60).trim()

        const descriptionTextAt = (rowIndex) =>
          wrapper.findAll('.notification-grid-row').at(rowIndex).find('.notification-description').text()

        it('truncates long Post content to ~120 characters', () => {
          postNotification.from.content = longContent
          propsData.notifications = [postNotification]
          wrapper = Wrapper()
          const text = descriptionTextAt(0)
          expect(text.length).toBeLessThan(longContent.length)
          expect(text.length).toBeLessThanOrEqual(125)
        })

        it('truncates long Comment content to ~180 characters', () => {
          commentNotification.from.content = longContent
          propsData.notifications = [commentNotification]
          wrapper = Wrapper()
          const text = descriptionTextAt(0)
          expect(text.length).toBeLessThan(longContent.length)
          expect(text.length).toBeGreaterThan(125)
          expect(text.length).toBeLessThanOrEqual(185)
        })
      })

      describe('unread status', () => {
        it('does not have class `notification-status`', () => {
          expect(wrapper.find('.notification-status').exists()).toBe(false)
        })

        it('clicking on a Post link emits `markNotificationAsRead`', () => {
          wrapper.find('a.notification-mention-post').trigger('click')
          expect(wrapper.emitted().markNotificationAsRead[0][0]).toEqual(postNotification.from.id)
        })

        it('adds class `notification-status` when read is true', () => {
          postNotification.read = true
          wrapper = Wrapper()
          expect(wrapper.find('.notification-status').exists()).toBe(true)
        })
      })

      describe('read/unread toggle button', () => {
        it('is hidden by default (prop-gated)', () => {
          postNotification.read = false
          wrapper = Wrapper()
          const row = wrapper.findAll('.notification-grid-row').at(0)
          expect(row.find('[data-test="toggle-mark-as-read"]').exists()).toBe(false)
          expect(row.find('[data-test="toggle-mark-as-unread"]').exists()).toBe(false)
        })

        describe('with show-read-toggle enabled (full-page list)', () => {
          beforeEach(() => {
            propsData.showReadToggle = true
          })

          it('shows the "mark as read" variant for unread notifications', () => {
            postNotification.read = false
            wrapper = Wrapper()
            const row = wrapper.findAll('.notification-grid-row').at(0)
            expect(row.find('[data-test="toggle-mark-as-read"]').exists()).toBe(true)
            expect(row.find('[data-test="toggle-mark-as-unread"]').exists()).toBe(false)
          })

          it('shows the "mark as unread" variant for read notifications', () => {
            postNotification.read = true
            wrapper = Wrapper()
            const row = wrapper.findAll('.notification-grid-row').at(0)
            expect(row.find('[data-test="toggle-mark-as-unread"]').exists()).toBe(true)
            expect(row.find('[data-test="toggle-mark-as-read"]').exists()).toBe(false)
          })

          it('emits `toggleNotificationRead` with the resource id and current read state', () => {
            postNotification.read = false
            wrapper = Wrapper()
            const row = wrapper.findAll('.notification-grid-row').at(0)
            row.find('[data-test="toggle-mark-as-read"]').trigger('click')
            expect(wrapper.emitted().toggleNotificationRead[0][0]).toEqual({
              resourceId: postNotification.from.id,
              read: false,
            })
          })

          it('emits with read=true when toggling a read notification', () => {
            postNotification.read = true
            wrapper = Wrapper()
            const row = wrapper.findAll('.notification-grid-row').at(0)
            row.find('[data-test="toggle-mark-as-unread"]').trigger('click')
            expect(wrapper.emitted().toggleNotificationRead[0][0]).toEqual({
              resourceId: postNotification.from.id,
              read: true,
            })
          })

          it('does not navigate when toggle is clicked', () => {
            postNotification.read = false
            wrapper = Wrapper()
            const row = wrapper.findAll('.notification-grid-row').at(0)
            row.find('[data-test="toggle-mark-as-read"]').trigger('click')
            expect(wrapper.emitted().markNotificationAsRead).toBeUndefined()
          })
        })
      })
    })
  })
})
