import { mount } from '@vue/test-utils'
import ResponsiveImage from './ResponsiveImage.vue'

const localVue = global.localVue

const image = {
  url: 'https://example.org/pic.jpg',
  w320: 'https://example.org/pic-w320.jpg',
  w640: 'https://example.org/pic-w640.jpg',
  w1024: 'https://example.org/pic-w1024.jpg',
}

const Wrapper = (propsData = {}) =>
  mount(ResponsiveImage, { propsData: { image, sizes: '320px', ...propsData }, localVue })

describe('ResponsiveImage', () => {
  it('offers every variant to the browser', () => {
    expect(Wrapper().attributes('srcset')).toBe(
      'https://example.org/pic-w320.jpg 320w, https://example.org/pic-w640.jpg 640w, https://example.org/pic-w1024.jpg 1024w',
    )
  })

  it('defers loading by default', () => {
    expect(Wrapper().attributes('loading')).toBe('lazy')
  })

  it('loads eagerly on request', () => {
    // For images that start inside a `display: none` subtree, where a deferred
    // one is never fetched at all.
    expect(Wrapper({ loading: 'eager' }).attributes('loading')).toBe('eager')
  })

  it('rejects a loading value the browser would not understand', () => {
    const { validator } = ResponsiveImage.props.loading
    expect(validator('eager')).toBe(true)
    expect(validator('whenever')).toBe(false)
  })

  describe('load', () => {
    it('fades in and announces itself', async () => {
      const wrapper = Wrapper()
      expect(wrapper.classes()).not.toContain('responsive-image--loaded')
      await wrapper.trigger('load')
      expect(wrapper.classes()).toContain('responsive-image--loaded')
      expect(wrapper.emitted('loaded')).toHaveLength(1)
    })

    it('catches an image that was already complete before mount', () => {
      // Cached images can finish before Vue attaches the listener; without the
      // mounted() check they would stay stuck at opacity 0.
      const wrapper = mount(ResponsiveImage, {
        propsData: { image, sizes: '320px' },
        localVue,
        attachTo: document.body,
      })
      Object.defineProperty(wrapper.element, 'complete', { value: true })
      Object.defineProperty(wrapper.element, 'naturalWidth', { value: 320 })
      wrapper.vm.$options.mounted[0].call(wrapper.vm)
      expect(wrapper.vm.loaded).toBe(true)
      wrapper.destroy()
    })
  })

  it('re-emits a failed load', async () => {
    // Native error events don't bubble, so parents can only learn about a
    // broken image through this re-emit.
    const wrapper = Wrapper()
    await wrapper.trigger('error')
    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(wrapper.classes()).not.toContain('responsive-image--loaded')
  })
})
