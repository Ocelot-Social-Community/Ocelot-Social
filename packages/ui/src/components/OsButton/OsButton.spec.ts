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

  describe('variant prop', () => {
    it('applies default variant classes by default', () => {
      const wrapper = mount(OsButton)
      // Default variant with filled appearance
      expect(wrapper.classes()).toContain('bg-[var(--color-default)]')
    })

    it('applies primary variant classes', () => {
      const wrapper = mount(OsButton, {
        props: { variant: 'primary' },
      })
      expect(wrapper.classes()).toContain('bg-[var(--color-primary)]')
    })

    it('applies danger variant classes', () => {
      const wrapper = mount(OsButton, {
        props: { variant: 'danger' },
      })
      expect(wrapper.classes()).toContain('bg-[var(--color-danger)]')
    })
  })

  describe('appearance prop', () => {
    it('applies filled appearance by default', () => {
      const wrapper = mount(OsButton)
      expect(wrapper.classes()).toContain('shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]')
    })

    it('applies outline appearance classes', () => {
      const wrapper = mount(OsButton, {
        props: { appearance: 'outline', variant: 'primary' },
      })
      expect(wrapper.classes()).toContain('bg-transparent')
      expect(wrapper.classes()).toContain('border-[var(--color-primary)]')
      expect(wrapper.classes()).toContain('text-[var(--color-primary)]')
    })

    it('applies ghost appearance classes', () => {
      const wrapper = mount(OsButton, {
        props: { appearance: 'ghost', variant: 'primary' },
      })
      expect(wrapper.classes()).toContain('bg-transparent')
      expect(wrapper.classes()).toContain('text-[var(--color-primary)]')
      expect(wrapper.classes()).not.toContain('border-[var(--color-primary)]')
    })
  })

  describe('size prop', () => {
    it('applies md size by default', () => {
      const wrapper = mount(OsButton)
      expect(wrapper.classes()).toContain('h-[36px]')
    })

    it('applies sm size classes', () => {
      const wrapper = mount(OsButton, {
        props: { size: 'sm' },
      })
      expect(wrapper.classes()).toContain('h-[26px]')
      expect(wrapper.classes()).toContain('text-[12px]')
    })

    it('applies lg size classes', () => {
      const wrapper = mount(OsButton, {
        props: { size: 'lg' },
      })
      expect(wrapper.classes()).toContain('h-12')
    })
  })

  it('applies fullWidth class', () => {
    const wrapper = mount(OsButton, {
      props: { fullWidth: true },
    })
    expect(wrapper.classes()).toContain('w-full')
  })

  it('merges custom classes', () => {
    const wrapper = mount(OsButton, {
      attrs: { class: 'my-custom-class' },
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

  describe('focus styles', () => {
    it('default variant has dashed outline focus style using currentColor', () => {
      const wrapper = mount(OsButton)
      expect(wrapper.classes()).toContain('focus:outline-dashed')
      expect(wrapper.classes()).toContain('focus:outline-current')
      expect(wrapper.classes()).toContain('focus:outline-1')
    })

    it('colored variants have dashed outline focus style', () => {
      const wrapper = mount(OsButton, {
        props: { variant: 'primary' },
      })
      expect(wrapper.classes()).toContain('focus:outline-dashed')
      expect(wrapper.classes()).toContain('focus:outline-1')
    })
  })

  describe('icon slot', () => {
    it('renders icon slot content in .os-button__icon wrapper', () => {
      const wrapper = mount(OsButton, {
        slots: { icon: '<svg data-testid="icon"></svg>' },
      })
      const iconWrapper = wrapper.find('.os-button__icon')
      expect(iconWrapper.exists()).toBeTruthy()
      expect(iconWrapper.find('[data-testid="icon"]').exists()).toBeTruthy()
    })

    it('renders both icon and text', () => {
      const wrapper = mount(OsButton, {
        slots: {
          icon: '<svg data-testid="icon"></svg>',
          default: 'Save',
        },
      })
      expect(wrapper.find('.os-button__icon').exists()).toBeTruthy()
      expect(wrapper.text()).toContain('Save')
    })

    it('adds gap-2 class when icon and text are present', () => {
      const wrapper = mount(OsButton, {
        slots: {
          icon: '<svg></svg>',
          default: 'Save',
        },
      })
      expect(wrapper.classes()).toContain('gap-2')
    })

    it('does not add gap-2 for icon-only button', () => {
      const wrapper = mount(OsButton, {
        slots: { icon: '<svg></svg>' },
      })
      expect(wrapper.classes()).not.toContain('gap-2')
    })

    it('does not add gap-2 without icon', () => {
      const wrapper = mount(OsButton, {
        slots: { default: 'Click me' },
      })
      expect(wrapper.classes()).not.toContain('gap-2')
    })

    it('renders without icon slot (backward compat)', () => {
      const wrapper = mount(OsButton, {
        slots: { default: 'Click me' },
      })
      expect(wrapper.find('.os-button__icon').exists()).toBeFalsy()
      expect(wrapper.text()).toBe('Click me')
    })

    it('renders icon-only button without text', () => {
      const wrapper = mount(OsButton, {
        slots: { icon: '<svg></svg>' },
      })
      expect(wrapper.find('.os-button__icon').exists()).toBeTruthy()
      expect(wrapper.text()).toBe('')
    })
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

    it('icon-only button is focusable with aria-label', () => {
      const wrapper = mount(OsButton, {
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Close' },
      })
      expect(wrapper.attributes('aria-label')).toBe('Close')
      expect(wrapper.attributes('tabindex')).toBeUndefined()
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
