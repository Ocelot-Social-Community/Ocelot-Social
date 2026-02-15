import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, markRaw } from 'vue'

import { ICON_SIZES } from './icon.variants'
import { IconCheck, IconClose, IconPlus, SYSTEM_ICONS } from './icons'
import OsIcon from './OsIcon.vue'

import type { Size } from '#src/types'

describe('osIcon', () => {
  describe('rendering', () => {
    it('renders a system icon by name', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('renders a custom render function via icon prop', () => {
      const CustomIcon = () => h('svg', { 'data-testid': 'custom' })
      const wrapper = mount(OsIcon, {
        props: { icon: CustomIcon },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
      expect(wrapper.find('[data-testid="custom"]').exists()).toBe(true)
    })

    it('renders a custom component object via icon prop', () => {
      const CustomIcon = markRaw(
        defineComponent({
          render: () => h('svg', { 'data-testid': 'component' }),
        }),
      )
      const wrapper = mount(OsIcon, {
        props: { icon: CustomIcon },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
      expect(wrapper.find('[data-testid="component"]').exists()).toBe(true)
    })

    it('renders nothing when neither name nor icon is provided', () => {
      const wrapper = mount(OsIcon)

      expect(wrapper.find('.os-icon').exists()).toBe(false)
      expect(wrapper.html()).toBe('')
    })

    it('icon prop takes precedence over name', () => {
      const CustomIcon = () => h('svg', { 'data-testid': 'custom' })
      const wrapper = mount(OsIcon, {
        props: { name: 'close', icon: CustomIcon },
      })

      expect(wrapper.find('[data-testid="custom"]').exists()).toBe(true)
    })

    it('renders nothing for unknown icon name', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'nonexistent' },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(false)
    })
  })

  describe('size prop', () => {
    const sizes = Object.entries(ICON_SIZES)

    it.each(sizes)('applies %s size class', (size, expectedClass) => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close', size: size as Size },
      })

      expect(wrapper.classes()).toContain(expectedClass)
    })

    it('defaults to md size', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.classes()).toContain('h-[1.2em]')
    })
  })

  describe('accessibility', () => {
    it('has aria-hidden="true" by default (decorative)', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.attributes('aria-hidden')).toBe('true')
    })

    it('does not have role="img" by default', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.attributes('role')).toBeUndefined()
    })

    it('has role="img" when aria-label is provided', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
        attrs: { 'aria-label': 'Close' },
      })

      expect(wrapper.attributes('role')).toBe('img')
      expect(wrapper.attributes('aria-label')).toBe('Close')
    })

    it('does not have aria-hidden when aria-label is provided', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
        attrs: { 'aria-label': 'Close' },
      })

      expect(wrapper.attributes('aria-hidden')).toBeUndefined()
    })
  })

  describe('css', () => {
    it('has fill-current class for color inheritance', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.classes()).toContain('[&>svg]:fill-current')
    })

    it('has inline-flex display', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.classes()).toContain('inline-flex')
    })

    it('merges custom classes', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
        attrs: { class: 'text-red-500' },
      })

      expect(wrapper.classes()).toContain('text-red-500')
      expect(wrapper.classes()).toContain('os-icon')
    })

    it('renders as span element', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('SPAN')
    })

    it('has shrink-0 class', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.classes()).toContain('shrink-0')
    })
  })

  describe('system icons', () => {
    const iconEntries = Object.entries(SYSTEM_ICONS)

    it('has 3 system icons registered', () => {
      expect(iconEntries).toHaveLength(3)
    })

    it.each(iconEntries)('renders "%s" without errors', (name) => {
      const wrapper = mount(OsIcon, {
        props: { name },
      })

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('path').exists()).toBe(true)
    })

    it('exports all icon components individually and renders them', () => {
      const icons = [IconCheck, IconClose, IconPlus]

      for (const icon of icons) {
        const wrapper = mount(OsIcon, { props: { icon } })

        expect(wrapper.find('svg').exists()).toBe(true)
      }
    })

    it('each icon SVG has viewBox attribute', () => {
      for (const name of Object.keys(SYSTEM_ICONS)) {
        const wrapper = mount(OsIcon, { props: { name } })
        const svg = wrapper.find('svg')

        expect(svg.attributes('viewBox'), `${name} should have viewBox`).toBe('0 0 32 32')
      }
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (decorative element)', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })

    it('renders as span element (not interactive)', () => {
      const wrapper = mount(OsIcon, {
        props: { name: 'close' },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('SPAN')
    })
  })
})
