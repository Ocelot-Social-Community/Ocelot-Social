import { shallowMount } from '@vue/test-utils'
import InfiniteScrollList from './InfiniteScrollList.vue'

const localVue = global.localVue

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'os-spinner': { template: '<div class="os-spinner" />' },
}

describe('InfiniteScrollList.vue', () => {
  const Wrapper = (props = {}, slots = {}) =>
    shallowMount(InfiniteScrollList, {
      propsData: { ...props },
      slots,
      mocks: { $t: jest.fn((str) => str) },
      stubs,
      localVue,
    })

  describe('title', () => {
    it('renders the title when provided', () => {
      const wrapper = Wrapper({ title: 'My List' })
      expect(wrapper.find('h5.title').text()).toContain('My List')
    })

    it('does not render title element when title is not provided', () => {
      const wrapper = Wrapper()
      expect(wrapper.find('h5.title').exists()).toBe(false)
    })

    it('appends count in parentheses when count is provided', () => {
      const wrapper = Wrapper({ title: 'My List', count: 42 })
      expect(wrapper.find('h5.title').text()).toContain('(42)')
    })

    it('does not show count when count is null', () => {
      const wrapper = Wrapper({ title: 'My List', count: null })
      expect(wrapper.find('h5.title').text()).not.toContain('(')
    })

    it('shows count of 0', () => {
      const wrapper = Wrapper({ title: 'My List', count: 0 })
      expect(wrapper.find('h5.title').text()).toContain('(0)')
    })
  })

  describe('nobody-message', () => {
    it('shows nobody-message when empty and not loading', () => {
      const wrapper = Wrapper({ empty: true, loading: false, nobodyMessage: 'Nothing here' })
      expect(wrapper.find('.nobody-message').text()).toBe('Nothing here')
    })

    it('hides nobody-message when loading', () => {
      const wrapper = Wrapper({ empty: true, loading: true, nobodyMessage: 'Nothing here' })
      expect(wrapper.find('.nobody-message').exists()).toBe(false)
    })

    it('hides nobody-message when not empty', () => {
      const wrapper = Wrapper({ empty: false, loading: false, nobodyMessage: 'Nothing here' })
      expect(wrapper.find('.nobody-message').exists()).toBe(false)
    })
  })

  describe('loading spinner', () => {
    it('shows spinner when loading', () => {
      const wrapper = Wrapper({ loading: true })
      expect(wrapper.find('.os-spinner').exists()).toBe(true)
    })

    it('hides spinner when not loading', () => {
      const wrapper = Wrapper({ loading: false })
      expect(wrapper.find('.os-spinner').exists()).toBe(false)
    })
  })

  describe('slot', () => {
    it('renders slot content', () => {
      const wrapper = Wrapper({}, { default: '<p class="item">Item</p>' })
      expect(wrapper.find('.item').exists()).toBe(true)
    })
  })

  describe('checkScrollable', () => {
    it('emits load-more when scroll container is not scrollable and hasMore is true', async () => {
      const wrapper = Wrapper({ hasMore: true, loading: false })
      Object.defineProperty(wrapper.vm.$refs.scrollEl, 'scrollHeight', {
        value: 100,
        configurable: true,
      })
      Object.defineProperty(wrapper.vm.$refs.scrollEl, 'clientHeight', {
        value: 200,
        configurable: true,
      })
      wrapper.vm.checkScrollable()
      expect(wrapper.emitted('load-more')).toBeTruthy()
    })

    it('does not emit load-more when hasMore is false', () => {
      const wrapper = Wrapper({ hasMore: false, loading: false })
      wrapper.vm.checkScrollable()
      expect(wrapper.emitted('load-more')).toBeFalsy()
    })

    it('does not emit load-more when loading', () => {
      const wrapper = Wrapper({ hasMore: true, loading: true })
      wrapper.vm.checkScrollable()
      expect(wrapper.emitted('load-more')).toBeFalsy()
    })
  })

  describe('onScroll', () => {
    it('emits load-more when scrolled to bottom threshold', () => {
      const wrapper = Wrapper({ hasMore: true, loading: false })
      const el = wrapper.vm.$refs.scrollEl
      Object.defineProperty(el, 'scrollTop', { value: 260, configurable: true })
      Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true })
      Object.defineProperty(el, 'scrollHeight', { value: 320, configurable: true })
      wrapper.vm.onScroll()
      expect(wrapper.emitted('load-more')).toBeTruthy()
    })

    it('does not emit load-more when not near bottom', () => {
      const wrapper = Wrapper({ hasMore: true, loading: false })
      const el = wrapper.vm.$refs.scrollEl
      Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true })
      Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true })
      Object.defineProperty(el, 'scrollHeight', { value: 320, configurable: true })
      wrapper.vm.onScroll()
      expect(wrapper.emitted('load-more')).toBeFalsy()
    })

    it('does not emit load-more when already loading', () => {
      const wrapper = Wrapper({ hasMore: true, loading: true })
      const el = wrapper.vm.$refs.scrollEl
      Object.defineProperty(el, 'scrollTop', { value: 260, configurable: true })
      Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true })
      Object.defineProperty(el, 'scrollHeight', { value: 320, configurable: true })
      wrapper.vm.onScroll()
      expect(wrapper.emitted('load-more')).toBeFalsy()
    })

    it('adds is-scrolling class on scroll', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ hasMore: false })
      wrapper.vm.onScroll()
      expect(wrapper.vm.$refs.scrollEl.classList.contains('is-scrolling')).toBe(true)
      jest.useRealTimers()
    })

    it('removes is-scrolling class after 800ms', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ hasMore: false })
      wrapper.vm.onScroll()
      jest.advanceTimersByTime(800)
      expect(wrapper.vm.$refs.scrollEl.classList.contains('is-scrolling')).toBe(false)
      jest.useRealTimers()
    })
  })
})
