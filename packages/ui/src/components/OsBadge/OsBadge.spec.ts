import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsBadge from './OsBadge.vue'

describe('osBadge', () => {
  describe('rendering', () => {
    it('renders as span element', () => {
      const wrapper = mount(OsBadge)

      expect((wrapper.element as HTMLElement).tagName).toBe('SPAN')
    })

    it('renders default slot content', () => {
      const wrapper = mount(OsBadge, {
        slots: { default: 'Badge text' },
      })

      expect(wrapper.text()).toBe('Badge text')
    })

    it('renders without content', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toBe('')
    })
  })

  describe('css', () => {
    it('has os-badge class', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.classes()).toContain('os-badge')
    })

    it('merges custom classes', () => {
      const wrapper = mount(OsBadge, {
        attrs: { class: 'my-custom-class' },
      })

      expect(wrapper.classes()).toContain('os-badge')
      expect(wrapper.classes()).toContain('my-custom-class')
    })

    it('passes through attributes', () => {
      const wrapper = mount(OsBadge, {
        attrs: { 'data-testid': 'my-badge' },
      })

      expect(wrapper.attributes('data-testid')).toBe('my-badge')
    })
  })

  describe('variant prop', () => {
    it('applies default variant classes when no variant specified', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.classes()).toContain('bg-[var(--color-default)]')
      expect(wrapper.classes()).toContain('text-[var(--color-default-contrast)]')
    })

    it('applies primary variant classes', () => {
      const wrapper = mount(OsBadge, {
        props: { variant: 'primary' },
      })

      expect(wrapper.classes()).toContain('bg-[var(--color-primary)]')
      expect(wrapper.classes()).toContain('text-[var(--color-primary-contrast)]')
    })

    it('applies danger variant classes', () => {
      const wrapper = mount(OsBadge, {
        props: { variant: 'danger' },
      })

      expect(wrapper.classes()).toContain('bg-[var(--color-danger)]')
      expect(wrapper.classes()).toContain('text-[var(--color-danger-contrast)]')
    })
  })

  describe('size prop', () => {
    it('applies sm size classes by default', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.classes()).toContain('text-[0.75rem]')
      expect(wrapper.classes()).toContain('px-[0.8em]')
    })

    it('applies md size classes', () => {
      const wrapper = mount(OsBadge, {
        props: { size: 'md' },
      })

      expect(wrapper.classes()).toContain('text-[0.875rem]')
      expect(wrapper.classes()).toContain('px-[1em]')
    })

    it('applies lg size classes', () => {
      const wrapper = mount(OsBadge, {
        props: { size: 'lg' },
      })

      expect(wrapper.classes()).toContain('text-[1rem]')
      expect(wrapper.classes()).toContain('px-[1.2em]')
    })
  })

  describe('shape prop', () => {
    it('applies pill shape by default', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.classes()).toContain('rounded-[2em]')
    })

    it('applies square shape', () => {
      const wrapper = mount(OsBadge, {
        props: { shape: 'square' },
      })

      expect(wrapper.classes()).toContain('rounded-[0.25em]')
    })
  })

  describe('aria attributes', () => {
    it('has no role or aria-live by default', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('aria-live')).toBeUndefined()
    })

    it('passes through role attribute', () => {
      const wrapper = mount(OsBadge, {
        attrs: { role: 'status' },
      })

      expect(wrapper.attributes('role')).toBe('status')
    })

    it('passes through aria-live attribute', () => {
      const wrapper = mount(OsBadge, {
        attrs: { 'aria-live': 'polite' },
      })

      expect(wrapper.attributes('aria-live')).toBe('polite')
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsBadge)

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })
})
