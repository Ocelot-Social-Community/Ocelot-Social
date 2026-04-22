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

      it('still processes unread data when a prior cache-only update had none', async () => {
        // Simulates Apollo `cache-and-network`: first update from cache is missing
        // the unread fields; the subsequent network response carries them and MUST
        // still trigger markAsRead.
        wrapper = await Wrapper()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [],
        })
        mocks.$apollo.mutate.mockClear()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: { id: 'mentioned_in_post/post-42/u1' },
          unreadCommentNotificationsByCurrentUser: [],
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { id: 'post-42' } }),
        )
      })

      it('merges new unread comment ids across successive updates', async () => {
        wrapper = await Wrapper()
        const c1 = document.createElement('div')
        c1.id = 'commentId-c1'
        const c2 = document.createElement('div')
        c2.id = 'commentId-c2'
        document.body.appendChild(c1)
        document.body.appendChild(c2)

        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n1', from: { __typename: 'Comment', id: 'c1' } },
          ],
        })
        await Vue.nextTick()
        expect(observe).toHaveBeenCalledWith(c1)
        observe.mockClear()

        // Second update (e.g. network after cache, or subscription) surfaces c2
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n1', from: { __typename: 'Comment', id: 'c1' } },
            { id: 'n2', from: { __typename: 'Comment', id: 'c2' } },
          ],
        })
        await Vue.nextTick()
        expect(observe).toHaveBeenCalledTimes(1)
        expect(observe).toHaveBeenCalledWith(c2)

        document.body.removeChild(c1)
        document.body.removeChild(c2)
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

      it('silently swallows markNotificationAsRead errors (best-effort)', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'nope' })
        await wrapper.vm.markNotificationAsRead('whatever')
        expect(mocks.$toast.error).not.toHaveBeenCalled()
      })

      it('observes nothing when IntersectionObserver is not supported', async () => {
        const saved = global.IntersectionObserver
        delete global.IntersectionObserver
        wrapper = await Wrapper()
        wrapper.vm._unreadCommentIds = new Set(['c1'])
        wrapper.vm.setupUnreadCommentObserver()
        expect(wrapper.vm._unreadCommentObserver).toBeNull()
        global.IntersectionObserver = saved
      })

      it('skips setup when the observer is already initialised', async () => {
        wrapper = await Wrapper()
        wrapper.vm._unreadCommentObserver = { observe: jest.fn() }
        wrapper.vm._unreadCommentIds = new Set(['c1'])
        wrapper.vm.setupUnreadCommentObserver()
        // The guard returns early; the mock observer instance is untouched
        expect(wrapper.vm._unreadCommentObserver.observe).not.toHaveBeenCalled()
      })

      it('ignores entries whose element was not registered as unread', async () => {
        wrapper = await Wrapper()
        const el = document.createElement('div')
        el.id = 'commentId-c1'
        document.body.appendChild(el)
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n1', from: { __typename: 'Comment', id: 'c1' } },
          ],
        })
        await Vue.nextTick()
        mocks.$apollo.mutate.mockClear()
        // An unrelated element (no dataset.unreadCommentId) should be ignored
        const stranger = document.createElement('div')
        makeIOStub.lastCallback([{ isIntersecting: true, target: stranger }])
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        // Non-intersecting entries also skipped
        makeIOStub.lastCallback([{ isIntersecting: false, target: el }])
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        document.body.removeChild(el)
      })

      it('tolerates missing DOM elements during observer setup', async () => {
        wrapper = await Wrapper()
        // No #commentId-cX in the DOM — setupUnreadCommentObserver should not throw
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n1', from: { __typename: 'Comment', id: 'missing' } },
          ],
        })
        await Vue.nextTick()
        expect(observe).not.toHaveBeenCalled()
      })

      it('disconnects the observer on beforeDestroy', async () => {
        wrapper = await Wrapper()
        const el = document.createElement('div')
        el.id = 'commentId-c1'
        document.body.appendChild(el)
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-42',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n1', from: { __typename: 'Comment', id: 'c1' } },
          ],
        })
        await Vue.nextTick()
        wrapper.destroy()
        expect(disconnect).toHaveBeenCalled()
        document.body.removeChild(el)
      })

      it('guards handleUnreadNotifications against a null post', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate.mockClear()
        wrapper.vm.handleUnreadNotifications(null)
        wrapper.vm.handleUnreadNotifications({})
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      it('treats missing unreadCommentNotificationsByCurrentUser as no comment notifs', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate.mockClear()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-without-comment-notifs',
          unreadNotificationByCurrentUser: null,
          // deliberately undefined to exercise the `|| []` fallback
        })
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        expect(wrapper.vm._unreadCommentIds.size).toBe(0)
      })

      it('filters out comment notifications with no `from`', async () => {
        wrapper = await Wrapper()
        await wrapper.vm.handleUnreadNotifications({
          id: 'post-x',
          unreadNotificationByCurrentUser: null,
          unreadCommentNotificationsByCurrentUser: [
            { id: 'n-with-from', from: { __typename: 'Comment', id: 'c1' } },
            { id: 'n-missing-from' }, // no `from` → optional chain returns undefined, filtered out
            { id: 'n-null-from', from: null },
          ],
        })
        expect(Array.from(wrapper.vm._unreadCommentIds)).toEqual(['c1'])
      })
    })

    describe('computed branches', () => {
      it('routes and heading pick the Event title for event posts', () => {
        // Testing the computeds in isolation avoids rendering the Event-specific
        // DateTimeRange child which has its own required props.
        const ctx = {
          post: { postType: ['Event'] },
          $t: (k) => k,
          $route: { params: { slug: 'slug', id: 'id' } },
        }
        expect(PostSlug.computed.heading.call(ctx)).toBe('post.viewEvent.title')
        expect(PostSlug.computed.routes.call(ctx)[0].name).toBe('post.viewEvent.title')
      })

      it('heroImageStyle returns a CSS variable object when image.aspectRatio is numeric', () => {
        // Tested in isolation — rendering the hero image requires a full ResponsiveImage object.
        const ctx = { post: { image: { aspectRatio: 2 } } }
        expect(PostSlug.computed.heroImageStyle.call(ctx)).toEqual({
          '--hero-image-aspect-ratio': 0.5,
        })
      })

      it('heroImageStyle returns false without an image or with a non-numeric aspect', () => {
        expect(PostSlug.computed.heroImageStyle.call({ post: {} })).toBe(false)
        expect(
          PostSlug.computed.heroImageStyle.call({ post: { image: { aspectRatio: 'n/a' } } }),
        ).toBe(false)
      })

      it('menuModalsData passes an empty title when the post is not yet loaded', () => {
        const deletePostCallback = jest.fn()
        const ctx = {
          post: null,
          $filters: { truncate: jest.fn() },
          deletePostCallback,
        }
        const result = PostSlug.computed.menuModalsData.call(ctx)
        expect(ctx.$filters.truncate).not.toHaveBeenCalled()
        expect(result).toBeDefined()
      })

      it('commentingAllowedByGroupRole reflects the current membership role', async () => {
        wrapper = await Wrapper()
        expect(wrapper.vm.commentingAllowedByGroupRole).toBeFalsy()
        wrapper.setData({ group: { myRole: 'usual' } })
        expect(wrapper.vm.commentingAllowedByGroupRole).toBe(true)
        wrapper.setData({ group: { myRole: 'pending' } })
        expect(wrapper.vm.commentingAllowedByGroupRole).toBe(false)
      })
    })

    describe('methods', () => {
      it('toggleShout optimistically updates and rolls back on failure', async () => {
        wrapper = await Wrapper()
        wrapper.vm._toggleShout = jest.fn().mockResolvedValue({ success: false })
        const beforeCount = wrapper.vm.shoutedCount
        const beforeShouted = wrapper.vm.shouted
        await wrapper.vm.toggleShout()
        expect(wrapper.vm.shoutedCount).toBe(beforeCount)
        expect(wrapper.vm.shouted).toBe(beforeShouted)
        expect(wrapper.vm.shoutLoading).toBe(false)
      })

      it('toggleShout keeps the optimistic state on success', async () => {
        wrapper = await Wrapper()
        wrapper.vm._toggleShout = jest.fn().mockResolvedValue({ success: true })
        await wrapper.vm.toggleShout()
        expect(wrapper.vm.shouted).toBe(true)
        expect(wrapper.vm.shoutedCount).toBe(1)
      })

      it('toggleShout decrements the count when un-shouting', async () => {
        wrapper = await Wrapper()
        wrapper.setData({ shouted: true, shoutedCount: 3 })
        wrapper.vm._toggleShout = jest.fn().mockResolvedValue({ success: true })
        await wrapper.vm.toggleShout()
        expect(wrapper.vm.shouted).toBe(false)
        expect(wrapper.vm.shoutedCount).toBe(2)
      })

      it('reply forwards the message to the CommentForm ref', async () => {
        wrapper = await Wrapper()
        const reply = jest.fn()
        wrapper.vm.$refs.commentForm = { reply }
        wrapper.vm.reply({ id: 'x' })
        expect(reply).toHaveBeenCalledWith({ id: 'x' })
      })

      it('reply is a no-op when the CommentForm ref is missing', async () => {
        wrapper = await Wrapper()
        wrapper.vm.$refs.commentForm = undefined
        expect(() => wrapper.vm.reply({ id: 'x' })).not.toThrow()
      })

      it('deletePostCallback reports mutation errors via $toast', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'boom' })
        await wrapper.vm.deletePostCallback()
        expect(mocks.$toast.error).toHaveBeenCalledWith('boom')
        expect(mocks.$router.push).not.toHaveBeenCalled()
      })

      it('createComment appends the comment and syncs observation state', async () => {
        wrapper = await Wrapper()
        const before = wrapper.vm.post.comments.length
        const newComment = {
          id: 'new',
          content: 'just posted',
          contentExcerpt: 'just posted',
          author: { id: '1stUser', slug: '1st-user' },
          isPostObservedByMe: true,
          postObservingUsersCount: 5,
        }
        await wrapper.vm.createComment(newComment)
        expect(wrapper.vm.post.comments).toHaveLength(before + 1)
        expect(wrapper.vm.post.isObservedByMe).toBe(true)
        expect(wrapper.vm.post.observingUsersCount).toBe(5)
      })

      it('toggleObservePost fires the mutation, refetches, and toasts success', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.queries = { Post: { refetch: jest.fn().mockResolvedValue() } }
        await wrapper.vm.toggleObservePost('post-1', true)
        expect(mocks.$apollo.mutate).toHaveBeenCalled()
        expect(mocks.$toast.success).toHaveBeenCalledWith('post.menu.observedSuccessfully')
        expect(mocks.$apollo.queries.Post.refetch).toHaveBeenCalled()
        expect(wrapper.vm.observeLoading).toBe(false)
      })

      it('toggleObservePost uses the unobserve success message when value=false', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.queries = { Post: { refetch: jest.fn().mockResolvedValue() } }
        await wrapper.vm.toggleObservePost('post-1', false)
        expect(mocks.$toast.success).toHaveBeenCalledWith('post.menu.unobservedSuccessfully')
      })

      it('toggleObservePost reports errors and still clears the loading flag', async () => {
        wrapper = await Wrapper()
        mocks.$apollo.mutate = jest.fn().mockRejectedValueOnce({ message: 'nope' })
        mocks.$apollo.queries = { Post: { refetch: jest.fn() } }
        await wrapper.vm.toggleObservePost('post-1', true)
        expect(mocks.$toast.error).toHaveBeenCalledWith('nope')
        expect(wrapper.vm.observeLoading).toBe(false)
      })

      it('toggleNewCommentForm toggles the visibility flag', async () => {
        wrapper = await Wrapper()
        wrapper.vm.toggleNewCommentForm(false)
        expect(wrapper.vm.showNewCommentForm).toBe(false)
        wrapper.vm.toggleNewCommentForm(true)
        expect(wrapper.vm.showNewCommentForm).toBe(true)
      })

      it('updateJoinLeave refetches the group and toasts', async () => {
        wrapper = await Wrapper()
        wrapper.setData({ post: { ...wrapper.vm.post, group: { name: 'Acme' } } })
        mocks.$apollo.queries = { Group: { refetch: jest.fn() } }
        wrapper.vm.updateJoinLeave()
        expect(mocks.$apollo.queries.Group.refetch).toHaveBeenCalled()
        expect(mocks.$toast.success).toHaveBeenCalled()
      })
    })

    describe('apollo options', () => {
      const postOpts = PostSlug.apollo.Post
      const groupOpts = PostSlug.apollo.Group

      it('Post.query returns a gql document', () => {
        expect(postOpts.query.call({ $i18n: { locale: () => 'en' } })).toBeTruthy()
      })

      it('Post.variables uses the route param id', () => {
        expect(postOpts.variables.call({ $route: { params: { id: '42' } } })).toEqual({ id: '42' })
      })

      it('Post.update hydrates component state from the response', () => {
        // Bind to a plain mock context — avoids re-rendering the component with
        // half-built image/comment objects.
        const ctx = {
          post: null,
          title: null,
          postAuthor: null,
          blurred: null,
          shouted: null,
          shoutedCount: null,
          _autoMarkedForPostId: null,
          _unreadCommentIds: new Set(),
          handleUnreadNotifications: jest.fn(),
        }
        postOpts.update.call(ctx, {
          Post: [
            {
              id: 'p1',
              title: 'hello',
              author: { id: 'a1' },
              image: { sensitive: true },
              shoutedByCurrentUser: true,
              shoutedCount: 7,
            },
          ],
        })
        expect(ctx.title).toBe('hello')
        expect(ctx.postAuthor).toEqual({ id: 'a1' })
        expect(ctx.blurred).toBe(true)
        expect(ctx.shouted).toBe(true)
        expect(ctx.shoutedCount).toBe(7)
        expect(ctx.handleUnreadNotifications).toHaveBeenCalledWith(ctx.post)
      })

      it('Post.update defaults to an empty object when the server returns no post', () => {
        const ctx = {
          post: null,
          shouted: true,
          shoutedCount: 5,
          handleUnreadNotifications: jest.fn(),
        }
        postOpts.update.call(ctx, { Post: [] })
        expect(ctx.post).toEqual({})
        expect(ctx.shouted).toBe(false)
        expect(ctx.shoutedCount).toBe(0)
      })

      it('Group.query returns a gql document', () => {
        expect(groupOpts.query.call({ $i18n: { locale: () => 'en' } })).toBeTruthy()
      })

      it('Group.variables returns the group id when the post has a group', () => {
        const ctx = { post: { group: { id: 'g1' } } }
        expect(groupOpts.variables.call(ctx)).toEqual({ id: 'g1' })
      })

      it('Group.variables returns id:null when the post has no group', () => {
        expect(groupOpts.variables.call({ post: null })).toEqual({ id: null })
        expect(groupOpts.variables.call({ post: {} })).toEqual({ id: null })
      })

      it('Group.update assigns the first returned group to state', () => {
        const ctx = { group: null }
        groupOpts.update.call(ctx, { Group: [{ id: 'g1', name: 'Acme' }] })
        expect(ctx.group).toEqual({ id: 'g1', name: 'Acme' })
      })

      it('Group.skip is true without a group and false otherwise', () => {
        expect(groupOpts.skip.call({ post: null })).toBe(true)
        expect(groupOpts.skip.call({ post: {} })).toBe(true)
        expect(groupOpts.skip.call({ post: { group: { id: 'g1' } } })).toBe(false)
      })
    })
  })
})
