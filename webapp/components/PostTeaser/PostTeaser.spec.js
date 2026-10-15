import { createLocalVue, shallowMount, mount, RouterLinkStub } from '@vue/test-utils'
import ClientOnly from 'vue-client-only'
import VTooltip from 'v-tooltip'
import Vuex from 'vuex'
import VueObserveVisibility from '~/plugins/vue-observe-visibility'
import { renderAndHydrate, setTimeZone } from '~/test/hydration'

import PostTeaser from './PostTeaser.vue'

const localVue = global.localVue

describe('PostTeaser', () => {
  let store
  let stubs
  let mocks
  let propsData
  let getters
  let actions
  let Wrapper
  let wrapper

  beforeEach(() => {
    propsData = {
      post: {
        id: 'p23',
        disabled: false,
        shoutedCount: 0,
        commentsCount: 0,
        clickedCount: 0,
        viewedTeaserCount: 0,
        name: 'It is a post',
        author: {
          id: 'u1',
        },
        postType: ['Article'],
      },
    }
    stubs = {
      NuxtLink: RouterLinkStub,
      'client-only': true,
      'v-popover': true,
    }
    mocks = {
      $t: jest.fn(),
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: { DeletePost: { id: 'deleted-post-id' } },
        }),
      },
    }
    getters = {
      'auth/isModerator': () => false,
      'auth/isAdmin': () => false,
      'auth/user': () => {
        return {}
      },
      'pinnedPosts/currentlyPinnedPosts': () => 0,
      'pinnedPosts/loaded': () => true,
    }
    actions = {
      'categories/init': jest.fn(),
      'pinnedPosts/fetch': jest.fn().mockResolvedValue(),
    }
  })

  describe('shallowMount', () => {
    Wrapper = () => {
      store = new Vuex.Store({ getters, actions })
      return shallowMount(PostTeaser, {
        store,
        propsData,
        mocks,
        localVue,
      })
    }

    it('has no validation errors', () => {
      const spy = jest.spyOn(global.console, 'error')
      Wrapper()
      expect(spy).not.toHaveBeenCalled()
      spy.mockReset()
    })

    beforeEach(() => {
      jest.useFakeTimers()
    })

    describe('test Post callbacks', () => {
      beforeEach(() => {
        wrapper = Wrapper()
      })

      describe('deletion of Post from Page by invoking "deletePostCallback()"', () => {
        beforeEach(() => {
          wrapper.vm.deletePostCallback()
        })

        describe('after timeout', () => {
          beforeEach(jest.runAllTimers)

          it('does call mutation', () => {
            expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
          })

          it('mutation is successful', () => {
            expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
          })

          it('emits "removePostFromList"', () => {
            expect(wrapper.emitted('removePostFromList')).toEqual([[{ id: 'deleted-post-id' }]])
          })
        })
      })
    })
  })

  describe('mount', () => {
    Wrapper = () => {
      const store = new Vuex.Store({
        getters,
        actions,
      })
      return mount(PostTeaser, {
        stubs,
        mocks,
        propsData,
        store,
        localVue,
      })
    }

    describe('given a post', () => {
      beforeEach(() => {
        propsData.post = {
          ...propsData.post,
          title: "It's a title",
        }
      })

      it('renders title', () => {
        expect(Wrapper().text()).toContain("It's a title")
      })
    })
  })

  describe('hydrating the server-rendered teaser of an event', () => {
    const SsrVue = createLocalVue()
    SsrVue.use(Vuex)
    SsrVue.use(VTooltip)
    SsrVue.use(VueObserveVisibility)
    SsrVue.component('ClientOnly', ClientOnly)
    SsrVue.component('NuxtLink', RouterLinkStub)
    SsrVue.prototype.$t = (key) =>
      ({
        'components.dateTimeRange.hourMinute': 'HH:mm',
        'components.dateTimeRange.yearMonthDay': 'MM/dd/yyyy',
      })[key] || key
    SsrVue.prototype.$policy = { get: () => false }
    SsrVue.prototype.$filters = { removeHtml: (html) => html, truncate: (text) => text }

    // 23:30–00:30 in Berlin, but 22:30–23:30 on the same day on a server running in UTC.
    const event = {
      id: 'p23',
      title: 'An event',
      content: 'Come along',
      author: { id: 'u1' },
      postType: ['Event'],
      shoutedCount: 0,
      commentsCount: 0,
      clickedCount: 0,
      viewedTeaserCount: 0,
      eventVenue: 'Town hall',
      eventLocationName: 'Friesack',
      eventIsOnline: false,
      eventStart: '2026-01-01T22:30:00.000Z',
      eventEnd: '2026-01-01T23:30:00.000Z',
    }

    const hydrate = () =>
      renderAndHydrate(
        {
          store: new Vuex.Store({ getters, actions }),
          render: (h) => h(PostTeaser, { props: { post: event } }),
        },
        {
          LocalVue: SsrVue,
          server: () => setTimeZone('UTC'),
          client: () => setTimeZone('Europe/Berlin'),
        },
      )

    afterEach(() => {
      setTimeZone(undefined)
      document.body.innerHTML = ''
    })

    it('matches the markup of the server', async () => {
      const { warnings } = await hydrate()
      expect(warnings).toEqual([])
    })

    it('shows the event in the time zone of the browser', async () => {
      const { vm } = await hydrate()
      const eventInfo = vm.$el.querySelector('.date-time-range').textContent.replace(/\s+/g, ' ')
      expect(eventInfo).toContain('01/01/2026 23:30')
      expect(eventInfo).toContain('01/02/2026 00:30')
    })
  })
})
