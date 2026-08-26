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

  it('renders as a plain, non-landmark div', () => {
    const wrapper = mount(OsRibbon, { props: { text: 'Article' } })

    expect((wrapper.element as HTMLElement).tagName).toBe('DIV')
  })

  describe('keyboard accessibility', () => {
    it('is not focusable and contains no focusable controls (non-interactive element)', () => {
      const wrapper = mount(OsRibbon, { props: { text: 'Article' } })
      const el = wrapper.element as HTMLElement

      expect(el.hasAttribute('tabindex')).toBe(false)
      expect(el.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
    })
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
