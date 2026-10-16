import { mount } from '@vue/test-utils'
import { branding } from '@ocelot-social/branding'
import Vue from 'vue'

import { contentAtoms } from '~/utils/cleanCut'

import GroupDescription from './GroupDescription.vue'

// The geometry itself is utils/cleanCut.spec.js's; here only what the component does with it.
jest.mock('~/utils/cleanCut', () => ({
  ...jest.requireActual('~/utils/cleanCut'),
  contentAtoms: jest.fn(() => []),
}))

const localVue = global.localVue

const LONG = '<p>A description far longer than the collapsed cap.</p>'

// jsdom does no layout, so every element reports height 0. Fake the two numbers the
// measurement reads: the natural height of the content and the height the cap leaves it.
// `content` is read through a function so a test can let the content grow later, the way
// tiptap's late attach or a loading image does in a browser.
const stubHeights = ({ content, clamp }) => {
  const originals = {
    scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
  }
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return this.parentElement?.classList.contains('description-clamp') ? content() : 0
    },
  })
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get() {
      if (!this.classList.contains('description-clamp')) return 0
      // Keyed off the inline max-height, where the cap lives: uncapped once expanded.
      return this.style.maxHeight ? clamp : content()
    },
  })
  return () => {
    Object.defineProperty(Element.prototype, 'scrollHeight', originals.scrollHeight)
    Object.defineProperty(Element.prototype, 'clientHeight', originals.clientHeight)
  }
}

// A ResizeObserver the test fires by hand, standing in for the browser noticing a new height.
class FakeResizeObserver {
  static instances = []

  constructor(callback) {
    this.callback = callback
    this.observed = []
    FakeResizeObserver.instances.push(this)
  }

  observe(element) {
    this.observed.push(element)
  }

  disconnect() {
    this.disconnected = true
  }

  fire() {
    this.callback([])
  }
}

describe('GroupDescription', () => {
  let contentHeight
  let restoreHeights

  beforeEach(() => {
    contentHeight = 500
    restoreHeights = stubHeights({ content: () => contentHeight, clamp: 100 })
    FakeResizeObserver.instances = []
    global.ResizeObserver = FakeResizeObserver
  })

  afterEach(() => {
    restoreHeights()
    delete global.ResizeObserver
  })

  const Wrapper = (description = LONG) =>
    mount(GroupDescription, {
      localVue,
      propsData: { description },
      mocks: { $t: (key) => key },
      stubs: {
        // Renders its content, so there is text to measure; real tiptap attaches its DOM
        // imperatively a tick later, which is what the observer is there for.
        'content-viewer': { props: ['content'], template: '<div v-html="content" />' },
      },
    })

  const clamp = (wrapper) => wrapper.find('[data-test="description-clamp"]')
  const toggle = (wrapper) => wrapper.find('[data-test="description-toggle"]')

  // Inline, not via a class: it has to hold on the first paint, before the stylesheet.
  it('caps the height at the branded number of lines while collapsed', () => {
    const wrapper = Wrapper()

    expect(clamp(wrapper).element.style.maxHeight).toBe(
      `calc(${branding.group.descriptionCollapsedLines} * var(--line-height-base, 1.3) * 1em)`,
    )
    expect(clamp(wrapper).element.style.overflow).toBe('hidden')
  })

  it('offers "show more" when the description exceeds the cap', async () => {
    const wrapper = Wrapper()
    await Vue.nextTick()

    expect(toggle(wrapper).text()).toBe('comment.show.more')
  })

  // #10487: cut cleanly, no fade over the last lines.
  it('does not fade the cut edge', async () => {
    const wrapper = Wrapper()
    await Vue.nextTick()

    expect(clamp(wrapper).classes()).toEqual(['content', 'hyphenate-text', 'description-clamp'])
  })

  it('lifts the cap once expanded and offers "show less"', async () => {
    const wrapper = Wrapper()
    await Vue.nextTick()

    await toggle(wrapper).trigger('click')

    expect(clamp(wrapper).element.style.maxHeight).toBe('')
    expect(toggle(wrapper).text()).toBe('comment.show.less')
  })

  // An always-visible toggle on a description that already fits is a dead end.
  it('offers no toggle when the description fits', async () => {
    contentHeight = 40
    const wrapper = Wrapper('<p>Short.</p>')
    await Vue.nextTick()

    expect(toggle(wrapper).exists()).toBe(false)
  })

  // #10488: tiptap attaches its content a tick after it renders, images load late, the
  // webfont swaps in. The first measurement can see far less than the reader will.
  it('offers "show more" when the content grows past the cap after mount', async () => {
    contentHeight = 0
    const wrapper = Wrapper()
    await Vue.nextTick()
    expect(toggle(wrapper).exists()).toBe(false)

    contentHeight = 500
    FakeResizeObserver.instances[0].fire()
    await Vue.nextTick()

    expect(toggle(wrapper).exists()).toBe(true)
  })

  describe('the cut (#10487)', () => {
    // Lines of 30px under a 100px cap: the fourth line would be sliced at 90–120.
    const thirtyPixelLines = Array.from({ length: 10 }, (_, i) => ({
      top: i * 30,
      bottom: (i + 1) * 30,
    }))

    afterEach(() => contentAtoms.mockReturnValue([]))

    it('ends the preview below the last whole line, not at the cap', async () => {
      contentAtoms.mockReturnValue(thirtyPixelLines)
      const wrapper = Wrapper()
      await Vue.nextTick()

      expect(clamp(wrapper).element.style.height).toBe('90px')
    })

    it('leaves the cap alone where there is no line to stop at', async () => {
      const wrapper = Wrapper()
      await Vue.nextTick()

      expect(clamp(wrapper).element.style.height).toBe('')
    })

    it('does not cut a description that fits', async () => {
      contentHeight = 40
      contentAtoms.mockReturnValue(thirtyPixelLines)
      const wrapper = Wrapper('<p>Short.</p>')
      await Vue.nextTick()

      expect(clamp(wrapper).element.style.height).toBe('')
    })

    it('shows everything once expanded', async () => {
      contentAtoms.mockReturnValue(thirtyPixelLines)
      const wrapper = Wrapper()
      await Vue.nextTick()

      await toggle(wrapper).trigger('click')

      expect(clamp(wrapper).element.style.height).toBe('')
    })
  })

  it('watches the inner element, the one that grows', () => {
    const wrapper = Wrapper()

    expect(FakeResizeObserver.instances[0].observed).toEqual([clamp(wrapper).element.firstChild])
  })

  it('measures again when the description is edited in place', async () => {
    contentHeight = 40
    const wrapper = Wrapper('<p>Short.</p>')
    await Vue.nextTick()
    expect(toggle(wrapper).exists()).toBe(false)

    contentHeight = 500
    await wrapper.setProps({ description: LONG })
    await Vue.nextTick()

    expect(toggle(wrapper).exists()).toBe(true)
  })

  it('starts a new description collapsed, so a toggle never outlives a text that fits', async () => {
    const wrapper = Wrapper()
    await Vue.nextTick()
    await toggle(wrapper).trigger('click')
    expect(toggle(wrapper).text()).toBe('comment.show.less')

    contentHeight = 40
    await wrapper.setProps({ description: '<p>Short.</p>' })
    await Vue.nextTick()

    expect(clamp(wrapper).element.style.maxHeight).not.toBe('')
    expect(toggle(wrapper).exists()).toBe(false)
  })

  it('stops watching when it goes away', () => {
    const wrapper = Wrapper()

    wrapper.destroy()

    expect(FakeResizeObserver.instances[0].disconnected).toBe(true)
  })

  // Where nothing can tell it the content grew, a cap could cut text off for good.
  it('does not cap at all where the size cannot be watched', async () => {
    delete global.ResizeObserver
    const wrapper = Wrapper()
    await Vue.nextTick()

    expect(clamp(wrapper).element.style.maxHeight).toBe('')
    expect(toggle(wrapper).exists()).toBe(false)
  })

  describe('before hydration', () => {
    // ContentViewer builds tiptap in data() and needs `document`, so the server-side
    // render emits the sanitized HTML as is. Asserted synchronously: hydration flips in
    // mounted()'s $nextTick, which has not run yet.
    it('renders the HTML without the tiptap viewer', () => {
      const wrapper = mount(GroupDescription, {
        localVue,
        propsData: { description: LONG },
        mocks: { $t: (key) => key },
        stubs: { 'content-viewer': { template: '<div class="viewer" />' } },
      })

      expect(wrapper.find('.viewer').exists()).toBe(false)
      expect(wrapper.text()).toContain('A description far longer')
    })
  })
})
