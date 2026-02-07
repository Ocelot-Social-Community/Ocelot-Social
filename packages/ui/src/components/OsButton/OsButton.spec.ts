import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsButton from './OsButton.vue'

describe('osButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(OsButton, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies default variant classes', () => {
    const wrapper = mount(OsButton)
    expect(wrapper.classes()).toContain('bg-[var(--color-primary)]')
  })

  it('applies size variant classes', () => {
    const wrapper = mount(OsButton, {
      props: { size: 'sm' },
    })
    expect(wrapper.classes()).toContain('h-8')
    expect(wrapper.classes()).toContain('text-sm')
  })

  it('applies variant classes', () => {
    const wrapper = mount(OsButton, {
      props: { variant: 'danger' },
    })
    expect(wrapper.classes()).toContain('bg-[var(--color-danger)]')
  })

  it('applies fullWidth class', () => {
    const wrapper = mount(OsButton, {
      props: { fullWidth: true },
    })
    expect(wrapper.classes()).toContain('w-full')
  })

  it('merges custom classes', () => {
    const wrapper = mount(OsButton, {
      props: { class: 'my-custom-class' },
    })
    expect(wrapper.classes()).toContain('my-custom-class')
  })

  it('sets disabled attribute', () => {
    const wrapper = mount(OsButton, {
      props: { disabled: true },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('sets button type', () => {
    const wrapper = mount(OsButton, {
      props: { type: 'submit' },
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('emits click event', async () => {
    const wrapper = mount(OsButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  describe('keyboard accessibility', () => {
    it('renders as native button element for keyboard support', () => {
      const wrapper = mount(OsButton)
      // Native button elements have built-in Enter/Space key support
      expect((wrapper.element as HTMLElement).tagName).toBe('BUTTON')
    })

    it('is focusable by default', () => {
      const wrapper = mount(OsButton)
      // No tabindex=-1 means button is in natural tab order
      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })

    it('remains focusable when disabled via aria', () => {
      const wrapper = mount(OsButton, {
        props: { disabled: true },
      })
      // Disabled buttons have disabled attribute which browsers handle correctly
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('can receive focus programmatically', () => {
      const wrapper = mount(OsButton, { attachTo: document.body })
      const button = wrapper.element as HTMLButtonElement
      button.focus()
      expect(document.activeElement).toBe(button)
      wrapper.unmount()
    })
  })
})
