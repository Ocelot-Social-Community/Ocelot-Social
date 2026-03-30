import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { markRaw } from 'vue-demi'

import { IconCheck } from '#src/components/OsIcon'

import OsCounterIcon from './OsCounterIcon.vue'

const icon = markRaw(IconCheck)

describe('osCounterIcon', () => {
  const defaultProps = { icon, count: 5 }

  it('renders with wrapper class', () => {
    const wrapper = mount(OsCounterIcon, { props: defaultProps })

    expect(wrapper.classes()).toContain('os-counter-icon')
  })

  it('renders the icon', () => {
    const wrapper = mount(OsCounterIcon, { props: defaultProps })

    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('displays the count badge when count > 0', () => {
    const wrapper = mount(OsCounterIcon, { props: defaultProps })

    expect(wrapper.find('.os-counter-icon__count').text()).toBe('5')
  })

  it('hides the count badge when count is 0', () => {
    const wrapper = mount(OsCounterIcon, { props: { icon, count: 0 } })

    expect(wrapper.find('.os-counter-icon__count').exists()).toBe(false)
  })

  it('caps count at 99+', () => {
    const wrapper = mount(OsCounterIcon, { props: { icon, count: 150 } })

    expect(wrapper.find('.os-counter-icon__count').text()).toBe('99+')
  })

  it('shows 99 without cap', () => {
    const wrapper = mount(OsCounterIcon, { props: { icon, count: 99 } })

    expect(wrapper.find('.os-counter-icon__count').text()).toBe('99')
  })

  describe('variants', () => {
    it('applies danger class', () => {
      const wrapper = mount(OsCounterIcon, { props: { ...defaultProps, danger: true } })

      expect(wrapper.find('.os-counter-icon__count--danger').exists()).toBe(true)
    })

    it('applies soft class', () => {
      const wrapper = mount(OsCounterIcon, { props: { ...defaultProps, soft: true } })

      expect(wrapper.find('.os-counter-icon__count--soft').exists()).toBe(true)
    })

    it('soft takes precedence over danger', () => {
      const wrapper = mount(OsCounterIcon, {
        props: { ...defaultProps, soft: true, danger: true },
      })

      expect(wrapper.find('.os-counter-icon__count--soft').exists()).toBe(true)
      expect(wrapper.find('.os-counter-icon__count--danger').exists()).toBe(false)
    })
  })

  describe('keyboard accessibility', () => {
    it('renders as non-interactive span (decorative element)', () => {
      const wrapper = mount(OsCounterIcon, { props: defaultProps })

      expect((wrapper.element as HTMLElement).tagName).toBe('SPAN')
    })

    it('is not focusable', () => {
      const wrapper = mount(OsCounterIcon, { props: defaultProps })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })
})
