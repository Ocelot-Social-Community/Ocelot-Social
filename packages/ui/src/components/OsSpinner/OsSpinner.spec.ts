import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsSpinner from './OsSpinner.vue'
import { SPINNER_SIZES } from './spinner.variants'

import type { Size } from '#src/types'

describe('osSpinner', () => {
  describe('rendering', () => {
    it('renders a spinner element', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.find('.os-spinner').exists()).toBe(true)
    })

    it('renders an SVG circle', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('circle').exists()).toBe(true)
    })

    it('renders as span element', () => {
      const wrapper = mount(OsSpinner)

      expect((wrapper.element as HTMLElement).tagName).toBe('SPAN')
    })

    it('svg has correct viewBox', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 50 50')
    })

    it('circle uses currentColor for stroke', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.find('circle').attributes('stroke')).toBe('currentColor')
    })

    it('circle has animation style', () => {
      const wrapper = mount(OsSpinner)
      const style = wrapper.find('circle').attributes('style') ?? ''

      expect(style).toContain('os-spinner-rotate')
      expect(style).toContain('os-spinner-dash')
    })
  })

  describe('size prop', () => {
    const sizes = Object.entries(SPINNER_SIZES)

    it.each(sizes)('applies %s size classes', (size, expectedClasses) => {
      const wrapper = mount(OsSpinner, {
        props: { size: size as Size },
      })
      const classes = wrapper.classes()

      for (const cls of expectedClasses.split(' ')) {
        expect(classes).toContain(cls)
      }
    })

    it('defaults to md size', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.classes()).toContain('h-[1.5em]')
      expect(wrapper.classes()).toContain('w-[1.5em]')
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.attributes('role')).toBe('status')
    })

    it('has default aria-label "Loading"', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.attributes('aria-label')).toBe('Loading')
    })

    it('allows custom aria-label', () => {
      const wrapper = mount(OsSpinner, {
        attrs: { 'aria-label': 'Saving changes' },
      })

      expect(wrapper.attributes('aria-label')).toBe('Saving changes')
    })

    it('is decorative when aria-hidden="true"', () => {
      const wrapper = mount(OsSpinner, {
        attrs: { 'aria-hidden': 'true' },
      })

      expect(wrapper.attributes('aria-hidden')).toBe('true')
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('aria-label')).toBeUndefined()
    })

    it('is semantic by default (no aria-hidden)', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.attributes('aria-hidden')).toBeUndefined()
      expect(wrapper.attributes('role')).toBe('status')
    })
  })

  describe('css', () => {
    it('has inline-flex display', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.classes()).toContain('inline-flex')
    })

    it('has shrink-0 class', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.classes()).toContain('shrink-0')
    })

    it('merges custom classes', () => {
      const wrapper = mount(OsSpinner, {
        attrs: { class: 'text-red-500' },
      })

      expect(wrapper.classes()).toContain('text-red-500')
      expect(wrapper.classes()).toContain('os-spinner')
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })

    it('has no interactive role', () => {
      const wrapper = mount(OsSpinner)

      expect(wrapper.attributes('role')).not.toBe('button')
      expect(wrapper.attributes('role')).not.toBe('link')
    })
  })
})
