import { mount } from '@vue/test-utils'
import { markRaw } from 'vue-demi'
import { describe, expect, it } from 'vitest'

import { IconCheck } from '#src/components/OsIcon'

import OcelotActionButton from './OcelotActionButton.vue'

const icon = markRaw(IconCheck)

describe('ocelotActionButton', () => {
  const defaultProps = { count: 5, ariaLabel: 'Like', icon }

  it('renders the count badge', () => {
    const wrapper = mount(OcelotActionButton, { props: defaultProps })

    expect(wrapper.find('.ocelot-action-button__count').text()).toBe('5')
  })

  it('renders with wrapper class', () => {
    const wrapper = mount(OcelotActionButton, { props: defaultProps })

    expect(wrapper.classes()).toContain('ocelot-action-button')
  })

  it('passes aria-label to the button', () => {
    const wrapper = mount(OcelotActionButton, { props: defaultProps })

    expect(wrapper.find('button').attributes('aria-label')).toBe('Like')
  })

  it('renders a circular OsButton', () => {
    const wrapper = mount(OcelotActionButton, { props: defaultProps })

    expect(wrapper.find('button').classes()).toContain('rounded-full')
  })

  describe('filled prop', () => {
    it('renders outline appearance by default', () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('data-appearance')).toBe('outline')
    })

    it('renders filled appearance when filled is true', () => {
      const wrapper = mount(OcelotActionButton, {
        props: { ...defaultProps, filled: true },
      })

      expect(wrapper.find('button').attributes('data-appearance')).toBe('filled')
    })
  })

  describe('disabled prop', () => {
    it('is not disabled by default', () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })

    it('disables the button when disabled is true', () => {
      const wrapper = mount(OcelotActionButton, {
        props: { ...defaultProps, disabled: true },
      })

      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })
  })

  describe('loading prop', () => {
    it('is not loading by default', () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })

      expect(wrapper.find('button').attributes('aria-busy')).toBeUndefined()
    })

    it('shows loading state when loading is true', () => {
      const wrapper = mount(OcelotActionButton, {
        props: { ...defaultProps, loading: true },
      })

      expect(wrapper.find('button').attributes('aria-busy')).toBe('true')
    })
  })

  describe('click event', () => {
    it('emits click when button is clicked', async () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('keyboard accessibility', () => {
    it('button is focusable', () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })
      const button = wrapper.find('button')

      expect(button.attributes('tabindex')).not.toBe('-1')
    })

    it('emits click on Enter key', async () => {
      const wrapper = mount(OcelotActionButton, { props: defaultProps })

      await wrapper.find('button').trigger('keydown.enter')
      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('icon slot', () => {
    it('renders custom icon slot content', () => {
      const wrapper = mount(OcelotActionButton, {
        props: defaultProps,
        slots: { icon: '<span class="custom-icon">★</span>' },
      })

      expect(wrapper.find('.custom-icon').exists()).toBe(true)
    })
  })
})
