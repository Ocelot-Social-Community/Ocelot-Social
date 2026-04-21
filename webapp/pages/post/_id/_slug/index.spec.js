import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import Vue from 'vue'
import PostSlug from './index.vue'
import CommentList from '~/components/CommentList/CommentList'
import HcHashtag from '~/components/Hashtag/Hashtag'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.directive('scrollTo', jest.fn())
localVue.use(VueMeta, { keyName: 'head' })

describe('PostSlug', () => {
  let wrapper, Wrapper, backendData, mocks, stubs

  beforeEach(() => {
    const author = { id: '1stUser', slug: '1st-user' }
    backendData = {
      post: {
        id: '1',
        author,
        postType: ['Article'],
        shoutedCount: 0,
        shoutedByCurrentUser: false,
        observingUsersCount: 0,
        isObservedByMe: false,
        comments: [
          {
            id: 'comment134',
            contentExcerpt: 'this is a comment',
            content: 'this is a comment',
            author,
          },
        ],
      },
      ready: true,
    }
  })

  describe('mount', () => {
    Wrapper = async (opts = {}) => {
      jest.useFakeTimers()
      const store = new Vuex.Store({
        getters: {
          'auth/user': () => {
            return { id: '1stUser' }
          },
          'auth/isModerator': () => false,
          'categories/categoriesActive': () => false,
        },
        actions: {
          'categories/init': jest.fn(),
          'pinnedPosts/fetch': jest.fn(),
        },
      })
      const propsData = {}
      mocks = {
        $t: jest.fn((t) => t),
        $filters: {
          truncate: (a) => a,
          removeHtml: (a) => a,
        },
        $route: {
          hash: '',
          params: {
            slug: 'slug',
            id: 'id',
          },
        },
        // If you are mocking the router, then don't use VueRouter with localVue: https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html
        $router: {
          push: jest.fn(),
        },
        $toast: {
          success: jest.fn(),
          error: jest.fn(),
        },
        $apollo: {
          mutate: jest.fn().mockResolvedValue(),
          query: jest.fn().mockResolvedValue({ data: { PostEmotionsCountByEmotion: {} } }),
        },
        $scrollTo: jest.fn(),
      }
      stubs = {
        'client-only': true,
        'nuxt-link': true,
        'router-link': true,
        HcEditor: { render: () => {}, methods: { insertReply: jest.fn(() => null) } },
        ContentViewer: true,
      }
      const defaults = {
        store,
        mocks,
        localVue,
        propsData,
        stubs,
      }
      const wrapper = mount(PostSlug, {
        ...defaults,
        ...opts,
      })
      wrapper.setData(backendData)
      await Vue.nextTick()
      return wrapper
    }

    it('has correct <head> content', async () => {
      wrapper = await Wrapper()
      expect(wrapper.vm.$metaInfo.title).toBe('loading')
    })

    describe('given author is `null`', () => {
      it('does not crash', async () => {
        backendData = {
          post: {
            id: '1',
            author: null,
            postType: ['Article'],
            shoutedCount: 0,
            shoutedByCurrentUser: false,
            observingUsersCount: 0,
            isObservedByMe: false,
            comments: [],
          },
          ready: true,
        }
        wrapper = await Wrapper()
        expect(wrapper.find('.info.anonymous').exists()).toBe(true)
      })
    })

    describe('test Post callbacks', () => {
      describe('deletion of Post from Page by invoking "deletePostCallback()"', () => {
        beforeEach(async () => {
          wrapper = await Wrapper()
          await wrapper.vm.deletePostCallback()
        })

        describe('after timeout', () => {
          beforeEach(jest.runAllTimers)

          it('does call mutation', () => {
            expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
          })

          it('mutation is successful', () => {
            expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
          })

          it('does go to index (main) page', () => {
            expect(mocks.$router.push).toHaveBeenCalledWith('/')
          })
        })
      })
    })

    describe('reply method called when emitted reply received', () => {
      it('CommentList', async () => {
        wrapper = await Wrapper()
        wrapper.findComponent(CommentList).vm.$emit('reply', {
          id: 'commentAuthorId',
          slug: 'ogerly',
        })
        expect(stubs.HcEditor.methods.insertReply).toHaveBeenCalledWith({
          id: 'commentAuthorId',
          slug: 'ogerly',
        })
      })
    })

    describe('tags shown in tag cloud', () => {
      beforeEach(async () => {
        // Create backendData with tags, not alphabetically sorted.
        backendData.post.tags = [
          { id: 'c' },
          { id: 'qw' },
          { id: 'BQ' },
          { id: '42' },
          { id: 'Bw' },
          { id: 'a' },
        ]

        wrapper = await Wrapper()
      })

      it('are present', async () => {
        // Get length from backendData and compare against number of tags present in component.
        expect(wrapper.findAllComponents(HcHashtag).length).toBe(backendData.post.tags.length)
      })

      it('are alphabetically ordered', async () => {
        // Get all HcHastag components
        const wrappers = wrapper.findAllComponents(HcHashtag).wrappers
        // Exctract ID properties (tag names) from component.
        const ids = []
        wrappers.forEach((x) => {
          ids.push({
            id: x.props().id,
          })
        })
        // Compare extracted IDs with solution.
        const idsAlphabetically = [
          { id: '42' },
          { id: 'a' },
          { id: 'BQ' },
          { id: 'Bw' },
          { id: 'c' },
          { id: 'qw' },
        ]
        expect(ids).toStrictEqual(idsAlphabetically)
      })
    })

    describe('auto-mark unread notifications', () => {
      let observe, unobserve, disconnect
      const makeIOStub = () => {
        observe = jest.fn()
        unobserve = jest.fn()
        disconnect = jest.fn()
        return jest.fn().mockImplementation((callback) => {
          makeIOStub.lastCallback = callback
          return { observe, unobserve, disconnect }
        })
      }

      let originalIO
      beforeEach(() => {
        originalIO = global.IntersectionObserver
        global.IntersectionObserver = makeIOStub()
      })
      afterEach(() => {
        global.IntersectionObserver = originalIO
      })

      it('fires markAsRead for the post when it has an unread post-level notification', async () => {
        wrapper = await Wrapper()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: { id: 'mentioned_in_post/post-42/u1' },
          unreadCommentNotificationsByCurrentUser: [],
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { id: 'post-42' } }),
        )
      })

      it('does nothing when there are no unread notifications', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate.mockClear()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [],
        })
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      it('is idempotent across multiple Apollo update() calls for the same post', async () => {
        wrapper = await Wrapper()
        const post = {
          id: 'post-42',
          unreadNotificationByCurrentUser: { id: 'mentioned_in_post/post-42/u1' },
          unreadCommentNotificationsByCurrentUser: [],
        }
        await wrapper.vm.handleUnreadNotifications(post)
        mocks.$apollo.mutate.mockClear()
        await wrapper.vm.handleUnreadNotifications(post)
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      it('sets up an IntersectionObserver when there are unread comment notifications', async () => {
        wrapper = await Wrapper()
        // Render a DOM element matching one of the unread comment ids
        const el = document.createElement('div')
        el.id = 'commentId-c1'
        document.body.appendChild(el)
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            {
              id: 'mentioned_in_comment/c1/u1',
              from: { __typename: 'Comment', id: 'c1' },
            },
          ],
        })
        await Vue.nextTick()
        expect(observe).toHaveBeenCalledWith(el)
        document.body.removeChild(el)
      })

      it('fires markAsRead(commentId) when a comment enters the viewport', async () => {
        wrapper = await Wrapper()
        const el = document.createElement('div')
        el.id = 'commentId-c1'
        document.body.appendChild(el)
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            {
              id: 'mentioned_in_comment/c1/u1',
              from: { __typename: 'Comment', id: 'c1' },
            },
          ],
        })
        await Vue.nextTick()
        mocks.$apollo.mutate.mockClear()
        // Simulate the comment entering the viewport
        makeIOStub.lastCallback([{ isIntersecting: true, target: el }])
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { id: 'c1' } }),
        )
        expect(unobserve).toHaveBeenCalledWith(el)
        document.body.removeChild(el)
      })
    })
  })
})
