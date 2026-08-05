import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsValidationHint from './OsValidationHint.vue'

describe('osValidationHint', () => {
  describe('rendering', () => {
    it('renders nothing when no props are provided', () => {
      const wrapper = mount(OsValidationHint)

      expect(wrapper.html()).toBe('')
    })

    it('renders nothing when all props are null', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: null, text: null, count: null, max: null },
      })

      expect(wrapper.html()).toBe('')
    })

    it('renders when text is provided', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Please fill in this field.' },
      })

      expect(wrapper.find('.os-validation-hint').exists()).toBe(true)
      expect(wrapper.text()).toContain('Please fill in this field.')
    })

    it('renders when count is provided', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 42 },
      })

      expect(wrapper.find('.os-validation-hint').exists()).toBe(true)
      expect(wrapper.text()).toContain('42')
    })

    it('renders when variant is provided', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'error' },
      })

      expect(wrapper.find('.os-validation-hint').exists()).toBe(true)
    })
  })

  describe('layout', () => {
    it('uses row layout when text is present', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Some error', count: 5, max: 100 },
      })

      expect(wrapper.classes()).toContain('flex')
      expect(wrapper.classes()).toContain('items-center')
      expect(wrapper.classes()).toContain('justify-between')
    })

    it('uses badge-only layout when no text', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 5 },
      })

      expect(wrapper.classes()).toContain('flex')
      expect(wrapper.classes()).toContain('justify-end')
      expect(wrapper.classes()).not.toContain('justify-between')
    })
  })

  describe('count display', () => {
    it('shows count without max', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 42 },
      })

      expect(wrapper.text()).toContain('42')
    })

    it('shows count with max as "count / max"', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 42, max: 100 },
      })

      expect(wrapper.text()).toContain('42 / 100')
    })

    it('shows count 0', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 0, max: 100 },
      })

      expect(wrapper.text()).toContain('0 / 100')
    })
  })

  describe('text paragraph', () => {
    it('renders text in a p element', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Validation message' },
      })

      const p = wrapper.find('p.os-validation-hint__text')

      expect(p.exists()).toBe(true)
      expect(p.text()).toBe('Validation message')
    })

    it('applies warning text color', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Warning message', variant: 'warning' },
      })

      const p = wrapper.find('p.os-validation-hint__text')

      expect(p.classes()).toContain('text-[var(--color-warning)]')
    })

    it('applies error text color', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Error message', variant: 'error' },
      })

      const p = wrapper.find('p.os-validation-hint__text')

      expect(p.classes()).toContain('text-[var(--color-danger)]')
    })
  })

  describe('variant', () => {
    it('renders badge with danger variant for error', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'error' },
      })

      const badge = wrapper.find('.os-badge')

      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('bg-[var(--color-danger)]')
    })

    it('renders badge with default variant (warning override via style) for warning', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'warning' },
      })

      const badge = wrapper.find('.os-badge')

      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('bg-[var(--color-default)]')
    })

    it('applies warning color override via CSS custom property on badge', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'warning' },
      })

      const badge = wrapper.find('.os-badge')

      expect((badge.element as HTMLElement).style.getPropertyValue('--color-default')).toBe(
        'var(--color-warning)',
      )
    })

    it('renders icon for error variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'error' },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
    })

    it('renders icon for warning variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'warning' },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
    })

    it('does not render icon without variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { count: 5 },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(false)
    })
  })

  describe('aria attributes', () => {
    it('has aria-live="polite" when no variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Some text' },
      })

      expect(wrapper.attributes('aria-live')).toBe('polite')
      expect(wrapper.attributes('role')).toBeUndefined()
    })

    it('has role="alert" and aria-live="assertive" for error variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'error', text: 'Error' },
      })

      expect(wrapper.attributes('role')).toBe('alert')
      expect(wrapper.attributes('aria-live')).toBe('assertive')
    })

    it('has role="alert" and aria-live="assertive" for warning variant', () => {
      const wrapper = mount(OsValidationHint, {
        props: { variant: 'warning', text: 'Warning' },
      })

      expect(wrapper.attributes('role')).toBe('alert')
      expect(wrapper.attributes('aria-live')).toBe('assertive')
    })
  })

  describe('combined props', () => {
    it('renders text and count together', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Too long', count: 120, max: 100, variant: 'error' },
      })

      expect(wrapper.find('p.os-validation-hint__text').text()).toBe('Too long')
      expect(wrapper.text()).toContain('120 / 100')
      expect(wrapper.find('.os-icon').exists()).toBe(true)
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsValidationHint, {
        props: { text: 'Validation message', variant: 'error' },
      })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })
})
