import { shallowMount } from '@vue/test-utils'
import InfiniteScrollList from './InfiniteScrollList.vue'

const localVue = global.localVue

const stubs = {
  'os-card': { template: '<div><slot /></div>' },
  'os-spinner': { template: '<div class="os-spinner" />' },
  'ocelot-input': {
    template: '<input class="ocelot-input" :placeholder="placeholder" />',
    props: ['name', 'placeholder', 'value', 'icon', 'size'],
  },
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

    it('emits scrolling-change true on first scroll', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ hasMore: false })
      wrapper.vm.onScroll()
      expect(wrapper.emitted('scrolling-change')).toEqual([[true]])
      jest.useRealTimers()
    })

    it('emits scrolling-change false after 800ms', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ hasMore: false })
      wrapper.vm.onScroll()
      jest.advanceTimersByTime(800)
      const emitted = wrapper.emitted('scrolling-change')
      expect(emitted[emitted.length - 1]).toEqual([false])
      jest.useRealTimers()
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

  describe('filter', () => {
    it('does not render filter input when showFilter is false', () => {
      const wrapper = Wrapper({ showFilter: false })
      expect(wrapper.find('.ocelot-input').exists()).toBe(false)
    })

    it('renders filter input when showFilter is true', () => {
      const wrapper = Wrapper({ showFilter: true })
      expect(wrapper.find('.ocelot-input').exists()).toBe(true)
    })

    it('uses filterPlaceholder prop as input placeholder', () => {
      const wrapper = Wrapper({ showFilter: true, filterPlaceholder: 'Search…' })
      expect(wrapper.find('.ocelot-input').attributes('placeholder')).toBe('Search…')
    })

    it('falls back to $t("common.filter") when filterPlaceholder is not set', () => {
      const wrapper = Wrapper({ showFilter: true })
      expect(wrapper.find('.ocelot-input').attributes('placeholder')).toBe('common.filter')
    })

    it('emits filter-change with value when input length meets filterMinLength', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ showFilter: true, filterMinLength: 3 })
      wrapper.vm.onFilterInput({ target: { value: 'abc' } })
      jest.advanceTimersByTime(300)
      expect(wrapper.emitted('filter-change')).toEqual([['abc']])
      jest.useRealTimers()
    })

    it('does not emit filter-change when input is shorter than filterMinLength', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ showFilter: true, filterMinLength: 3 })
      wrapper.vm.onFilterInput({ target: { value: 'ab' } })
      jest.advanceTimersByTime(300)
      expect(wrapper.emitted('filter-change')).toBeFalsy()
      jest.useRealTimers()
    })

    it('emits filter-change with empty string when input is cleared', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ showFilter: true, filterMinLength: 3 })
      wrapper.vm.onFilterInput({ target: { value: '' } })
      jest.advanceTimersByTime(300)
      expect(wrapper.emitted('filter-change')).toEqual([['']])
      jest.useRealTimers()
    })

    it('debounces: only emits once after rapid input', () => {
      jest.useFakeTimers()
      const wrapper = Wrapper({ showFilter: true, filterMinLength: 3 })
      wrapper.vm.onFilterInput({ target: { value: 'ab' } })
      wrapper.vm.onFilterInput({ target: { value: 'abc' } })
      wrapper.vm.onFilterInput({ target: { value: 'abcd' } })
      jest.advanceTimersByTime(300)
      expect(wrapper.emitted('filter-change')).toHaveLength(1)
      expect(wrapper.emitted('filter-change')[0]).toEqual(['abcd'])
      jest.useRealTimers()
    })

    it('updates internal filterValue on input', () => {
      const wrapper = Wrapper({ showFilter: true })
      wrapper.vm.onFilterInput({ target: { value: 'test' } })
      expect(wrapper.vm.filterValue).toBe('test')
    })
  })
})
