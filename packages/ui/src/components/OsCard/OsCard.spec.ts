import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsCard from './OsCard.vue'

describe('osCard', () => {
  describe('rendering', () => {
    it('renders as div element by default', () => {
      const wrapper = mount(OsCard)

      expect((wrapper.element as HTMLElement).tagName).toBe('DIV')
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

  describe('as prop', () => {
    it('renders as article when as="article"', () => {
      const wrapper = mount(OsCard, {
        props: { as: 'article' },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('ARTICLE')
    })

    it('renders as section when as="section"', () => {
      const wrapper = mount(OsCard, {
        props: { as: 'section' },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('SECTION')
    })

    it('renders as aside when as="aside"', () => {
      const wrapper = mount(OsCard, {
        props: { as: 'aside' },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('ASIDE')
    })
  })

  describe('css', () => {
    it('has os-card class', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.classes()).toContain('os-card')
    })

    it('has padding when no heroImage slot', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.classes()).toContain('p-6')
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
    it('does not have outline class by default', () => {
      const wrapper = mount(OsCard)

      expect(wrapper.classes()).not.toContain('outline-1')
    })

    it('adds outline class when highlight is true', () => {
      const wrapper = mount(OsCard, {
        props: { highlight: true },
      })

      expect(wrapper.classes()).toContain('outline-1')
    })

    it('does not add outline class when highlight is false', () => {
      const wrapper = mount(OsCard, {
        props: { highlight: false },
      })

      expect(wrapper.classes()).not.toContain('outline-1')
    })
  })

  describe('heroImage slot', () => {
    const heroSlots = {
      heroImage: '<img src="/test.jpg" alt="Hero" />',
      default: '<p>Content</p>',
    }

    it('renders heroImage slot content', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('img').attributes('alt')).toBe('Hero')
    })

    it('wraps heroImage in os-card__hero-image div', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      const heroDiv = wrapper.find('.os-card__hero-image')

      expect(heroDiv.exists()).toBe(true)
      expect(heroDiv.find('img').exists()).toBe(true)
    })

    it('wraps default content in os-card__content div', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      const contentDiv = wrapper.find('.os-card__content')

      expect(contentDiv.exists()).toBe(true)
      expect(contentDiv.find('p').text()).toBe('Content')
    })

    it('does not have padding on card when heroImage is present', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      expect(wrapper.classes()).not.toContain('p-6')
    })

    it('content wrapper has padding when heroImage is present', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      expect(wrapper.find('.os-card__content').classes()).toContain('p-6')
    })

    it('does not create wrapper divs without heroImage slot', () => {
      const wrapper = mount(OsCard, {
        slots: { default: '<p>Content</p>' },
      })

      expect(wrapper.find('.os-card__hero-image').exists()).toBe(false)
      expect(wrapper.find('.os-card__content').exists()).toBe(false)
    })

    it('renders heroImage before content', () => {
      const wrapper = mount(OsCard, { slots: heroSlots })

      const heroImage = wrapper.find('.os-card__hero-image')
      const content = wrapper.find('.os-card__content')

      expect(heroImage.exists()).toBe(true)
      expect(content.exists()).toBe(true)
      expect(heroImage.element.compareDocumentPosition(content.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
