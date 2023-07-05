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
        },
      })
      const propsData = {}
      mocks = {
        $t: jest.fn(),
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
          history: {
            push: jest.fn(),
          },
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
        $env: {
          CATEGORIES_ACTIVE: false,
        },
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
            comments: [],
            postType: ['Article'],
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
            expect(mocks.$router.history.push).toHaveBeenCalledTimes(1)
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
  })
})
