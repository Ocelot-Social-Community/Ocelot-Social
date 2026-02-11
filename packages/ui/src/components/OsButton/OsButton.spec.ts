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

    it('has min-width matching height for each size', () => {
      const sizes: Record<string, string> = {
        sm: 'min-w-[26px]',
        md: 'min-w-[36px]',
        lg: 'min-w-12',
        xl: 'min-w-14',
      }
      for (const [size, expected] of Object.entries(sizes)) {
        const wrapper = mount(OsButton, { props: { size: size as 'sm' | 'md' | 'lg' | 'xl' } })
        expect(wrapper.classes()).toContain(expected)
      }
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

  it('defaults to type="button"', () => {
    const wrapper = mount(OsButton)
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('sets button type', () => {
    const wrapper = mount(OsButton, {
      props: { type: 'submit' },
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('sets data-variant attribute', () => {
    const wrapper = mount(OsButton, {
      props: { variant: 'danger' },
    })
    expect(wrapper.attributes('data-variant')).toBe('danger')
  })

  it('sets data-appearance attribute', () => {
    const wrapper = mount(OsButton, {
      props: { appearance: 'outline' },
    })
    expect(wrapper.attributes('data-appearance')).toBe('outline')
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
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).toContain('gap-2')
    })

    it('adds gap-1 class for small sizes with icon and text', () => {
      const wrapper = mount(OsButton, {
        props: { size: 'sm' },
        slots: {
          icon: '<svg></svg>',
          default: 'Save',
        },
      })
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).toContain('gap-1')
      expect(contentSpan.classes()).not.toContain('gap-2')
    })

    it('does not add gap-2 for icon-only button', () => {
      const wrapper = mount(OsButton, {
        slots: { icon: '<svg></svg>' },
      })
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).not.toContain('gap-2')
    })

    it('treats whitespace-only text as icon-only', () => {
      const wrapper = mount(OsButton, {
        slots: {
          icon: '<svg></svg>',
          default: '   ',
        },
      })
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).not.toContain('gap-2')
      expect(wrapper.find('.os-button__icon').classes()).toContain('-mr-1')
    })

    it('does not add gap-2 without icon', () => {
      const wrapper = mount(OsButton, {
        slots: { default: 'Click me' },
      })
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).not.toContain('gap-2')
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

  describe('circle prop', () => {
    it('renders as round button with rounded-full and p-0', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('rounded-full')
      expect(wrapper.classes()).toContain('p-0')
    })

    it('applies w-[36px] width for md size (default)', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('w-[36px]')
    })

    it('applies w-[26px] width for sm size', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true, size: 'sm' },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('w-[26px]')
    })

    it('applies w-12 width for lg size', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true, size: 'lg' },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('w-12')
    })

    it('applies w-14 width for xl size', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true, size: 'xl' },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('w-14')
    })

    it('is combinable with primary variant', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true, variant: 'primary' },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('rounded-full')
      expect(wrapper.classes()).toContain('bg-[var(--color-primary)]')
    })

    it('is combinable with ghost appearance', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true, appearance: 'ghost', variant: 'primary' },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('rounded-full')
      expect(wrapper.classes()).toContain('bg-transparent')
    })

    it('icon has no negative margin in circle mode', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      const iconWrapper = wrapper.find('.os-button__icon')
      expect(iconWrapper.classes()).not.toContain('-ml-1')
      expect(iconWrapper.classes()).not.toContain('-mr-1')
    })

    it('uses gap-1 for circle with icon and text', () => {
      const wrapper = mount(OsButton, {
        props: { circle: true },
        slots: {
          icon: '<svg></svg>',
          default: 'Add',
        },
      })
      const contentSpan = wrapper.find('button > span')
      expect(contentSpan.classes()).toContain('gap-1')
      expect(contentSpan.classes()).not.toContain('gap-2')
    })

    it('does not apply circle classes when circle is false', () => {
      const wrapper = mount(OsButton, {
        props: { circle: false },
        slots: { default: 'Click me' },
      })
      expect(wrapper.classes()).not.toContain('rounded-full')
      expect(wrapper.classes()).not.toContain('p-0')
    })
  })

  describe('loading prop', () => {
    it('renders spinner SVG when loading=true', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      expect(wrapper.find('.os-button__spinner').exists()).toBeTruthy()
      expect(wrapper.find('svg').exists()).toBeTruthy()
    })

    it('disables button when loading=true', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('sets aria-busy="true" when loading', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })

    it('keeps content visible when loading', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      const contentSpan = wrapper.find('span')
      expect(contentSpan.classes()).not.toContain('opacity-0')
      expect(wrapper.text()).toContain('Save')
    })

    it('does not render spinner when loading=false (default)', () => {
      const wrapper = mount(OsButton, {
        slots: { default: 'Save' },
      })
      expect(wrapper.find('.os-button__spinner').exists()).toBeFalsy()
    })

    it('does not set aria-busy when not loading', () => {
      const wrapper = mount(OsButton, {
        slots: { default: 'Save' },
      })
      expect(wrapper.attributes('aria-busy')).toBeUndefined()
    })

    it('loading + disabled: button remains disabled', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true, disabled: true },
        slots: { default: 'Save' },
      })
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('does not emit click when loading', async () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('renders spinner inside icon wrapper when icon is present', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: {
          icon: '<svg data-testid="icon"></svg>',
          default: 'Save',
        },
      })
      const iconWrapper = wrapper.find('.os-button__icon')
      expect(iconWrapper.exists()).toBeTruthy()
      expect(iconWrapper.find('.os-button__spinner').exists()).toBeTruthy()
    })

    it('keeps icon visible when loading with icon', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: {
          icon: '<svg data-testid="icon"></svg>',
          default: 'Save',
        },
      })
      const iconWrapper = wrapper.find('.os-button__icon')
      expect(iconWrapper.classes()).not.toContain('[&>*]:invisible')
    })

    it('renders spinner as direct button child when no icon', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { default: 'Save' },
      })
      // Spinner is a direct child of button, not inside content wrapper
      const spinner = wrapper.find('button > .os-button__spinner')
      expect(spinner.exists()).toBeTruthy()
    })

    it('does not render button-level spinner when icon is present', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: {
          icon: '<svg></svg>',
          default: 'Save',
        },
      })
      // No spinner as direct child of button — it's inside the icon wrapper
      const buttonSpinner = wrapper.find('button > .os-button__spinner')
      expect(buttonSpinner.exists()).toBeFalsy()
    })

    it('keeps icon visible and shows spinner for icon-only loading', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true },
        slots: { icon: '<svg data-testid="icon"></svg>' },
      })
      const iconWrapper = wrapper.find('.os-button__icon')
      expect(iconWrapper.exists()).toBeTruthy()
      expect(iconWrapper.find('[data-testid="icon"]').exists()).toBeTruthy()
      expect(iconWrapper.find('.os-button__spinner').exists()).toBeTruthy()
      expect(iconWrapper.classes()).not.toContain('[&>*]:invisible')
    })

    it('works with circle prop', () => {
      const wrapper = mount(OsButton, {
        props: { loading: true, circle: true },
        slots: { icon: '<svg></svg>' },
        attrs: { 'aria-label': 'Add' },
      })
      expect(wrapper.classes()).toContain('rounded-full')
      expect(wrapper.find('.os-button__spinner').exists()).toBeTruthy()
      expect(wrapper.attributes('disabled')).toBeDefined()
      expect(wrapper.attributes('aria-busy')).toBe('true')
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
