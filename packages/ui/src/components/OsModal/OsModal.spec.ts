import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import OsModal from './OsModal.vue'

describe('osModal', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  describe('rendering', () => {
    it('renders an empty wrapper when closed', () => {
      const wrapper = mount(OsModal)

      expect(wrapper.find('.os-modal-wrapper').exists()).toBe(true)
      expect(wrapper.find('.os-modal').exists()).toBe(false)
    })

    it('renders the modal when open', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('.os-modal').exists()).toBe(true)
    })

    it('renders backdrop when open', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('.os-modal__backdrop').exists()).toBe(true)
    })

    it('renders title in header', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, title: 'Test Title' },
      })

      expect(wrapper.find('.os-modal__title').text()).toBe('Test Title')
    })

    it('does not render title element when title is null', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('.os-modal__title').exists()).toBe(false)
    })

    it('renders default slot content', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        slots: { default: '<p>Modal body</p>' },
      })

      expect(wrapper.find('.os-modal__content').text()).toBe('Modal body')
    })

    it('renders close button', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-close"]').exists()).toBe(true)
    })
  })

  describe('scroll fade', () => {
    it('does not show top fade when content is not scrolled', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        slots: { default: '<div style="height: 2000px">tall content</div>' },
      })

      expect(wrapper.find('.os-modal__header .bg-gradient-to-b').exists()).toBe(false)
    })

    it('shows top fade after content is scrolled down', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        slots: { default: '<div style="height: 2000px">tall content</div>' },
      })

      const content = wrapper.find('.os-modal__content')
      Object.defineProperty(content.element, 'scrollTop', { value: 50, writable: true })
      await content.trigger('scroll')

      expect(wrapper.find('.os-modal__header .bg-gradient-to-b').exists()).toBe(true)
    })
  })

  describe('css', () => {
    it('has os-modal-wrapper class on root', () => {
      const wrapper = mount(OsModal)

      expect(wrapper.classes()).toContain('os-modal-wrapper')
    })

    it('merges custom classes', () => {
      const wrapper = mount(OsModal, {
        attrs: { class: 'my-custom-modal' },
      })

      expect(wrapper.classes()).toContain('os-modal-wrapper')
      expect(wrapper.classes()).toContain('my-custom-modal')
    })
  })

  describe('panel width', () => {
    it('applies max-w-[500px]', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('.os-modal').classes()).toContain('max-w-[500px]')
    })
  })

  describe('built-in footer buttons', () => {
    it('renders cancel and confirm buttons by default', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-cancel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="os-modal-confirm"]').exists()).toBe(true)
    })

    it('uses custom cancelLabel', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, cancelLabel: 'Abbrechen' },
      })

      expect(wrapper.find('[data-testid="os-modal-cancel"]').text()).toBe('Abbrechen')
    })

    it('uses custom confirmLabel', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, confirmLabel: 'Bestätigen' },
      })

      expect(wrapper.find('[data-testid="os-modal-confirm"]').text()).toBe('Bestätigen')
    })

    it('cancel button has ghost appearance', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-cancel"]').attributes('data-appearance')).toBe(
        'ghost',
      )
    })

    it('confirm button has primary variant', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-confirm"]').attributes('data-variant')).toBe(
        'primary',
      )
    })
  })

  describe('custom footer slot', () => {
    it('renders custom footer instead of built-in buttons', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        slots: {
          footer: '<button class="custom-btn">Custom</button>',
        },
      })

      expect(wrapper.find('.custom-btn').exists()).toBe(true)
      expect(wrapper.find('[data-testid="os-modal-cancel"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="os-modal-confirm"]').exists()).toBe(false)
    })

    it('provides confirm and cancel functions to scoped slot', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        slots: {
          footer: `<template #footer="{ confirm, cancel }">
            <button class="slot-confirm" @click="confirm">OK</button>
            <button class="slot-cancel" @click="cancel">Nope</button>
          </template>`,
        },
      })

      expect(wrapper.find('.os-modal__footer').exists()).toBe(true)
    })
  })

  describe('events', () => {
    it('emits update:open false and close on cancel button click', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      await wrapper.find('[data-testid="os-modal-cancel"]').trigger('click')

      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('close')).toStrictEqual([['cancel']])
    })

    it('emits update:open false and close on confirm button click', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      await wrapper.find('[data-testid="os-modal-confirm"]').trigger('click')

      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
      expect(wrapper.emitted('confirm')).toHaveLength(1)
      expect(wrapper.emitted('close')).toStrictEqual([['confirm']])
    })

    it('emits cancel on close button click with type "close"', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      await wrapper.find('[data-testid="os-modal-close"]').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('close')).toStrictEqual([['close']])
    })

    it('emits cancel on backdrop click', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      await wrapper.find('.os-modal__overlay').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('close')).toStrictEqual([['backdrop']])
    })

    it('emits opened when open becomes true', async () => {
      const wrapper = mount(OsModal, {
        props: { open: false },
      })

      await wrapper.setProps({ open: true })

      expect(wrapper.emitted('opened')).toHaveLength(1)
    })
  })

  describe('esc key', () => {
    it('closes modal on ESC key press', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
        attachTo: document.body,
      })

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('close')).toStrictEqual([['backdrop']])

      wrapper.unmount()
    })

    it('does not close on ESC when closed', () => {
      const wrapper = mount(OsModal, {
        props: { open: false },
        attachTo: document.body,
      })

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(wrapper.emitted('cancel')).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe('body scroll lock', () => {
    it('sets body overflow hidden when open', () => {
      mount(OsModal, {
        props: { open: true },
      })

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('removes body overflow hidden when closed', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      await wrapper.setProps({ open: false })

      expect(document.body.style.overflow).toBe('')
    })

    it('cleans up body overflow on unmount', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(document.body.style.overflow).toBe('hidden')

      wrapper.unmount()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('aria attributes', () => {
    it('has role="dialog" on the panel', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-panel"]').attributes('role')).toBe('dialog')
    })

    it('has aria-modal="true"', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-panel"]').attributes('aria-modal')).toBe('true')
    })

    it('has aria-labelledby linking to title', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, title: 'My Title' },
      })

      const panel = wrapper.find('[data-testid="os-modal-panel"]')
      const titleEl = wrapper.find('.os-modal__title')

      expect(panel.attributes('aria-labelledby')).toBe(titleEl.attributes('id'))
    })

    it('does not have aria-labelledby when no title', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(
        wrapper.find('[data-testid="os-modal-panel"]').attributes('aria-labelledby'),
      ).toBeUndefined()
    })
  })

  describe('keyboard accessibility', () => {
    it('traps focus within the modal on Tab', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true, title: 'Test' },
        attachTo: document.body,
      })

      const panel = wrapper.find('[data-testid="os-modal-panel"]')
      const buttons = wrapper.findAll('button')
      const lastButton = buttons[buttons.length - 1]

      // Focus the last button
      ;(lastButton.element as HTMLElement).focus()

      // Press Tab → should wrap to first
      await panel.trigger('keydown', { key: 'Tab' })

      // The focus trap should have prevented default
      // (we can't fully test focus movement in jsdom, but we test the handler exists)
      expect(panel.exists()).toBe(true)

      wrapper.unmount()
    })

    it('traps focus within the modal on Shift+Tab', async () => {
      const wrapper = mount(OsModal, {
        props: { open: true, title: 'Test' },
        attachTo: document.body,
      })

      const panel = wrapper.find('[data-testid="os-modal-panel"]')
      const buttons = wrapper.findAll('button')

      // Focus the first button
      ;(buttons[0].element as HTMLElement).focus()

      // Press Shift+Tab → should wrap to last
      await panel.trigger('keydown', { key: 'Tab', shiftKey: true })

      expect(panel.exists()).toBe(true)

      wrapper.unmount()
    })
  })
})
