import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsNumber from './OsNumber.vue'

describe('osNumber', () => {
  describe('rendering', () => {
    it('renders as div element', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('DIV')
    })

    it('has os-number class', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.classes()).toContain('os-number')
    })

    it('displays count as text', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 42 },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('42')
    })

    it('displays 0 when count is 0', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('0')
    })
  })

  describe('label', () => {
    it('shows label when set', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0, label: 'Followers' },
      })

      expect(wrapper.find('.os-number-label').exists()).toBe(true)
      expect(wrapper.find('.os-number-label').text()).toBe('Followers')
    })

    it('hides label when not set', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.find('.os-number-label').exists()).toBe(false)
    })
  })

  describe('css', () => {
    it('merges custom classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
        attrs: { class: 'my-custom-class' },
      })

      expect(wrapper.classes()).toContain('os-number')
      expect(wrapper.classes()).toContain('my-custom-class')
    })

    it('passes through attributes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
        attrs: { 'data-testid': 'my-number' },
      })

      expect(wrapper.attributes('data-testid')).toBe('my-number')
    })

    it('applies count styling classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 42 },
      })

      expect(wrapper.find('.os-number-count').classes()).toContain('font-bold')
      expect(wrapper.find('.os-number-count').classes()).toContain('text-[1.5rem]')
    })

    it('applies label styling classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0, label: 'Test' },
      })

      expect(wrapper.find('.os-number-label').classes()).toContain('text-[12px]')
      expect(wrapper.find('.os-number-label').classes()).toContain('text-[var(--color-text-soft)]')
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })
})
