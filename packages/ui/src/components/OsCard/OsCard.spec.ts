import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsCard from './OsCard.vue'

describe('osCard', () => {
  describe('rendering', () => {
    it('renders as article element', () => {
      const wrapper = mount(OsCard)

      expect((wrapper.element as HTMLElement).tagName).toBe('ARTICLE')
    })

    it('renders default slot content', () => {
      const wrapper = mount(OsCard, {
        slots: { default: '<p>Card content</p>' },
      })

      expect(wrapper.find('p').text()).toBe('Card content')
    })

    it('renders without content', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toBe('')
    })
  })

  describe('css', () => {
    it('has os-card class', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.classes()).toContain('os-card')
    })

    it('merges custom classes', () => {
      const wrapper = mount(OsCard, {
        attrs: { class: 'my-custom-class' },
      })

      expect(wrapper.classes()).toContain('os-card')
      expect(wrapper.classes()).toContain('my-custom-class')
    })

    it('passes through attributes', () => {
      const wrapper = mount(OsCard, {
        attrs: { 'data-testid': 'my-card' },
      })

      expect(wrapper.attributes('data-testid')).toBe('my-card')
    })
  })

  describe('highlight', () => {
    it('does not have border class by default', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.classes()).not.toContain('border')
    })

    it('adds border class when highlight is true', () => {
      const wrapper = mount(OsCard, {
        props: { highlight: true },
      })

      expect(wrapper.classes()).toContain('border')
    })

    it('does not add border class when highlight is false', () => {
      const wrapper = mount(OsCard, {
        props: { highlight: false },
      })

      expect(wrapper.classes()).not.toContain('border')
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })

    it('has no interactive role', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.attributes('role')).toBeUndefined()
    })
  })
})
