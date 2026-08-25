import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsRibbon from './OsRibbon.vue'

describe('osRibbon', () => {
  it('renders with wrapper class', () => {
    const wrapper = mount(OsRibbon, { props: { text: 'Article' } })

    expect(wrapper.classes()).toContain('os-ribbon')
  })

  it('renders the text', () => {
    const wrapper = mount(OsRibbon, { props: { text: 'Article' } })

    expect(wrapper.text()).toBe('Article')
  })

  it('renders as a non-interactive aside', () => {
    const wrapper = mount(OsRibbon, { props: { text: 'Article' } })

    expect((wrapper.element as HTMLElement).tagName).toBe('ASIDE')
  })

  describe('variants', () => {
    it('applies the event modifier class when type is Event', () => {
      const wrapper = mount(OsRibbon, { props: { text: 'Event', type: 'Event' } })

      expect(wrapper.classes()).toContain('os-ribbon--event')
    })

    it('does not apply the event modifier class for other types', () => {
      const wrapper = mount(OsRibbon, { props: { text: 'Article', type: 'Article' } })

      expect(wrapper.classes()).not.toContain('os-ribbon--event')
    })

    it('applies the pinned modifier class', () => {
      const wrapper = mount(OsRibbon, { props: { text: 'Article', pinned: true } })

      expect(wrapper.classes()).toContain('os-ribbon--pinned')
    })

    it('applies both modifier classes when an event is pinned', () => {
      const wrapper = mount(OsRibbon, { props: { text: 'Event', type: 'Event', pinned: true } })

      expect(wrapper.classes()).toContain('os-ribbon--event')
      expect(wrapper.classes()).toContain('os-ribbon--pinned')
    })
  })
})
