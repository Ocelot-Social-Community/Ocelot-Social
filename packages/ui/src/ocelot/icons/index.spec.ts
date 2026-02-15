import { mount } from '@vue/test-utils'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { h } from 'vue'

import OsIcon from '#src/components/OsIcon/OsIcon.vue'

import { ocelotIcons } from './index'

describe('ocelot icons', () => {
  const IconAngleDown = ocelotIcons.IconAngleDown

  describe('exports', () => {
    it('exports ocelotIcons as a record of functions', () => {
      expectTypeOf(ocelotIcons).toBeObject()

      expect(Object.keys(ocelotIcons).length).toBeGreaterThan(0)
    })

    it('auto-discovers all SVGs in svgs/ directory', () => {
      expect(ocelotIcons).toHaveProperty('IconAngleDown')

      expectTypeOf(IconAngleDown).toBeFunction()
    })
  })

  describe('iconAngleDown', () => {
    it('renders an SVG with correct viewBox', () => {
      const vnode = IconAngleDown()

      expect(vnode).toBeDefined()

      const wrapper = mount({
        render: () => h('div', [IconAngleDown()]),
      })
      const svg = wrapper.find('svg')

      expect(svg.exists()).toBe(true)
      expect(svg.attributes('viewBox')).toBe('0 0 32 32')
    })

    it('works with OsIcon :icon prop', () => {
      const wrapper = mount(OsIcon, {
        props: { icon: IconAngleDown },
      })

      expect(wrapper.find('.os-icon').exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('path').exists()).toBe(true)
    })
  })

  describe('keyboard accessibility', () => {
    it('icon via :icon prop is not focusable (decorative element)', () => {
      const wrapper = mount(OsIcon, {
        props: { icon: IconAngleDown },
      })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
      expect(wrapper.attributes('aria-hidden')).toBe('true')
    })
  })
})
