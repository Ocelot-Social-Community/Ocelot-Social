import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { markRaw } from 'vue-demi'

import { IconCheck } from '#src/components/OsIcon'

import OcelotLabeledButton from './OcelotLabeledButton.vue'

const icon = markRaw(IconCheck)

describe('ocelotLabeledButton', () => {
  const defaultProps = { icon, label: 'Filter' }

  it('renders the label', () => {
    const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

    expect(wrapper.find('.ocelot-labeled-button__label').text()).toBe('Filter')
  })

  it('passes label as aria-label to the button', () => {
    const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

    expect(wrapper.find('button').attributes('aria-label')).toBe('Filter')
  })

  it('renders with wrapper class', () => {
    const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

    expect(wrapper.classes()).toContain('ocelot-labeled-button')
  })

  it('renders a circular OsButton', () => {
    const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

    expect(wrapper.find('button').classes()).toContain('rounded-full')
  })

  describe('filled prop', () => {
    it('renders outline appearance by default', () => {
      const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('data-appearance')).toBe('outline')
    })

    it('renders filled appearance when filled is true', () => {
      const wrapper = mount(OcelotLabeledButton, {
        props: { ...defaultProps, filled: true },
      })

      expect(wrapper.find('button').attributes('data-appearance')).toBe('filled')
    })
  })

  describe('click event', () => {
    it('emits click when button is clicked', async () => {
      const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('keyboard accessibility', () => {
    it('renders a native button element (inherits keyboard support)', () => {
      const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('button is not excluded from tab order', () => {
      const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('tabindex')).not.toBe('-1')
    })

    it('has an accessible name via aria-label', () => {
      const wrapper = mount(OcelotLabeledButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('aria-label')).toBe('Filter')
    })
  })

  describe('icon slot', () => {
    it('renders custom icon slot content', () => {
      const wrapper = mount(OcelotLabeledButton, {
        props: defaultProps,
        slots: { icon: '<span class="custom-icon">★</span>' },
      })

      expect(wrapper.find('.custom-icon').exists()).toBe(true)
    })
  })
})
