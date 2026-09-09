import { mount } from '@vue/test-utils'
import MapEventPopover from './MapEventPopover.vue'

const localVue = global.localVue

const post = {
  id: 'p1',
  slug: 'kindergeburtstag',
  title: 'Kindergeburtstag',
  author: { id: 'u1', name: 'Peter Lustig', slug: 'peter-lustig' },
  eventVenue: 'Ellis Kinderzimmer',
  eventLocationName: 'Hamburg',
  eventIsOnline: false,
  eventStart: '2027-06-02T15:00:00.000Z',
  eventEnd: '2027-06-02T18:00:00.000Z',
  image: null,
}

const postWithImage = {
  ...post,
  image: { url: '/some-image.jpg', aspectRatio: 1.5, sensitive: false },
}

describe('MapEventPopover', () => {
  const stubs = {
    NuxtLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
    ResponsiveImage: true,
    UserAvatar: true,
    LocationTeaser: true,
    DateTimeRange: true,
  }

  const Wrapper = (propsData) => {
    return mount(MapEventPopover, {
      localVue,
      propsData,
      stubs,
      mocks: {
        $t: jest.fn((t) => t),
      },
    })
  }

  describe('while the query has not settled yet', () => {
    it('shows a loading spinner', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.os-spinner').exists()).toBe(true)
    })

    it('shows the no-image close button (there is no image to anchor to yet)', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      expect(wrapper.find('.close-button-no-img').exists()).toBe(true)
      expect(wrapper.find('.close-button-w-img').exists()).toBe(false)
    })
  })

  describe('given an already-loaded post (post prop), without an image', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper({ post })
    })

    it('skips the loading state and shows content immediately', () => {
      expect(wrapper.find('.loading-state').exists()).toBe(false)
      expect(wrapper.vm.showContent).toBe(true)
    })

    it('renders the title and a link to the post', () => {
      expect(wrapper.find('.event-title').text()).toBe('Kindergeburtstag')
      const to = JSON.parse(wrapper.find('.event-link').attributes('data-to'))
      expect(to).toEqual(
        expect.objectContaining({ params: { id: 'p1', slug: 'kindergeburtstag' } }),
      )
    })

    it('shows no image wrapper', () => {
      expect(wrapper.find('.image-wrapper-outer').exists()).toBe(false)
    })

    it('shows the ribbon inline in the content row, not anchored to an image', () => {
      expect(wrapper.find('.event-ribbon').exists()).toBe(true)
      expect(wrapper.find('.event-ribbon-w-img').exists()).toBe(false)
    })

    it('shows the no-image close button, anchored to the popover root', () => {
      expect(wrapper.find('.close-button-no-img').exists()).toBe(true)
      expect(wrapper.find('.close-button-w-img').exists()).toBe(false)
    })

    it('gives .content the extra no-image top padding', () => {
      expect(wrapper.find('.content').classes()).toContain('content--no-image')
    })

    it('emits close when the close button is clicked', async () => {
      await wrapper.find('.close-button-no-img').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('given an already-loaded post with an image', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper({ post: postWithImage })
    })

    it('shows the image wrapper and the on-image ribbon/close button', () => {
      expect(wrapper.find('.image-wrapper-outer').exists()).toBe(true)
      expect(wrapper.find('.event-ribbon-w-img').exists()).toBe(true)
      expect(wrapper.find('.close-button-w-img').exists()).toBe(true)
    })

    it('does not show the no-image ribbon/close button', () => {
      expect(wrapper.find('.event-ribbon').exists()).toBe(false)
      expect(wrapper.find('.close-button-no-img').exists()).toBe(false)
    })

    it('does not add the no-image content padding class', () => {
      expect(wrapper.find('.content').classes()).not.toContain('content--no-image')
    })

    it('emits close when the on-image close button is clicked, without navigating', async () => {
      await wrapper.find('.close-button-w-img').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('resolvedPost precedence', () => {
    it('prefers the post prop over a query result', () => {
      const wrapper = mount(MapEventPopover, {
        localVue,
        propsData: { postId: 'p1', post },
        data: () => ({ Post: [{ ...post, id: 'other', title: 'Other title' }] }),
        stubs,
        mocks: { $t: jest.fn((t) => t) },
      })
      expect(wrapper.vm.resolvedPost.id).toBe('p1')
    })

    it('falls back to the query result when no post prop is given', () => {
      const wrapper = mount(MapEventPopover, {
        localVue,
        propsData: { postId: 'p1' },
        data: () => ({ Post: [post] }),
        stubs,
        mocks: { $t: jest.fn((t) => t) },
      })
      expect(wrapper.vm.resolvedPost).toEqual(post)
    })
  })

  describe('once the query settles without finding the post', () => {
    it('shows the unavailable message', async () => {
      jest.useFakeTimers()
      const wrapper = mount(MapEventPopover, {
        localVue,
        propsData: { postId: 'missing' },
        stubs,
        mocks: { $t: jest.fn((t) => t) },
      })
      wrapper.vm.onQuerySettled()
      jest.advanceTimersByTime(400)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.unavailable-state').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'HcEmpty' }).exists()).toBe(true)
      jest.useRealTimers()
    })
  })

  describe('onQuerySettled', () => {
    it('reveals content immediately once the minimum spinner time has already passed', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      wrapper.vm.minSpinnerDone = true
      wrapper.vm.onQuerySettled()
      expect(wrapper.vm.showContent).toBe(true)
    })

    it('only marks the query as settled while still within the minimum spinner time', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      wrapper.vm.onQuerySettled()
      expect(wrapper.vm.querySettled).toBe(true)
      expect(wrapper.vm.showContent).toBe(false)
    })
  })

  describe('resolvedPost watcher', () => {
    it('reveals content once a post arrives after the minimum spinner time has passed', async () => {
      const wrapper = mount(MapEventPopover, {
        localVue,
        propsData: { postId: 'p1' },
        data: () => ({ Post: [] }),
        stubs,
        mocks: { $t: jest.fn((t) => t) },
      })
      wrapper.vm.minSpinnerDone = true
      wrapper.setData({ Post: [post] })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.showContent).toBe(true)
    })

    it('does not reveal content yet while still within the minimum spinner time', async () => {
      const wrapper = mount(MapEventPopover, {
        localVue,
        propsData: { postId: 'p1' },
        data: () => ({ Post: [] }),
        stubs,
        mocks: { $t: jest.fn((t) => t) },
      })
      wrapper.setData({ Post: [post] })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.showContent).toBe(false)
    })
  })

  describe('beforeDestroy', () => {
    it('clears the pending minimum-spinner-time timer', () => {
      jest.useFakeTimers()
      const clearSpy = jest.spyOn(global, 'clearTimeout')
      const wrapper = Wrapper({ postId: 'p1' })
      wrapper.destroy()
      expect(clearSpy).toHaveBeenCalledWith(wrapper.vm.spinnerTimer)
      clearSpy.mockRestore()
      jest.useRealTimers()
    })
  })

  describe('apollo Post query definition', () => {
    it('builds the postTeaserQuery and passes the postId as a variable', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      const { Post } = wrapper.vm.$options.apollo
      expect(Post.query.call(wrapper.vm)).toBeTruthy()
      expect(Post.variables.call(wrapper.vm)).toEqual({ id: 'p1' })
    })

    it('skips the query once a post prop is already given', () => {
      const wrapper = Wrapper({ postId: 'p1', post })
      expect(wrapper.vm.$options.apollo.Post.skip.call(wrapper.vm)).toBe(true)
    })

    it('does not skip the query when only postId is given', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      expect(wrapper.vm.$options.apollo.Post.skip.call(wrapper.vm)).toBe(false)
    })

    it('marks the query settled on both result and error', () => {
      const wrapper = Wrapper({ postId: 'p1' })
      const settledSpy = jest.spyOn(wrapper.vm, 'onQuerySettled')
      wrapper.vm.$options.apollo.Post.result.call(wrapper.vm)
      wrapper.vm.$options.apollo.Post.error.call(wrapper.vm)
      expect(settledSpy).toHaveBeenCalledTimes(2)
    })
  })
})
