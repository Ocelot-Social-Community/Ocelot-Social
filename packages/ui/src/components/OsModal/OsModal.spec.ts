import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

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
    it('applies max-w-[500px] by default (size md)', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('.os-modal').classes()).toContain('max-w-[500px]')
    })

    it.each([
      ['sm', 'max-w-[400px]'],
      ['md', 'max-w-[500px]'],
      ['lg', 'max-w-[700px]'],
    ] as const)('applies %s size as %s', (size, expected) => {
      const wrapper = mount(OsModal, {
        props: { open: true, size },
      })

      const classes = wrapper.find('.os-modal').classes()

      expect(classes).toContain(expected)
      expect(classes.filter((c) => c.startsWith('max-w-'))).toStrictEqual([expected])
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

    it('restores previous body overflow value when closed', async () => {
      document.body.style.overflow = 'auto'

      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ open: false })

      expect(document.body.style.overflow).toBe('auto')
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

    it('has aria-label fallback when no title', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      const panel = wrapper.find('[data-testid="os-modal-panel"]')

      expect(panel.attributes('aria-labelledby')).toBeUndefined()
      expect(panel.attributes('aria-label')).toBe('Dialog')
    })

    it('uses custom ariaLabel when no title', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, ariaLabel: 'Confirm deletion' },
      })

      expect(wrapper.find('[data-testid="os-modal-panel"]').attributes('aria-label')).toBe(
        'Confirm deletion',
      )
    })
  })

  describe('close button label', () => {
    it('defaults to an English fallback', () => {
      const wrapper = mount(OsModal, {
        props: { open: true },
      })

      expect(wrapper.find('[data-testid="os-modal-close"]').attributes('aria-label')).toBe('Close')
    })

    it('uses the closeLabel prop', () => {
      const wrapper = mount(OsModal, {
        props: { open: true, closeLabel: 'Schließen' },
      })

      expect(wrapper.find('[data-testid="os-modal-close"]').attributes('aria-label')).toBe(
        'Schließen',
      )
    })
  })

  describe('keyboard accessibility', () => {
    let trigger: HTMLButtonElement

    beforeEach(() => {
      trigger = document.createElement('button')
      trigger.textContent = 'open'
      document.body.appendChild(trigger)
      trigger.focus()
    })

    afterEach(() => {
      trigger.remove()
    })

    function mountOpen(slots: Record<string, string> = {}) {
      return mount(OsModal, {
        props: { open: true, title: 'Test' },
        slots,
        attachTo: document.body,
      })
    }

    function pressTab(panel: HTMLElement, shiftKey = false) {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
      panel.dispatchEvent(event)
      return event
    }

    describe('focus on open', () => {
      it('moves focus to the panel when nothing asks for it', async () => {
        const wrapper = mountOpen()
        await nextTick()

        expect(document.activeElement).toBe(wrapper.find('[data-testid="os-modal-panel"]').element)

        wrapper.unmount()
      })

      it('moves focus to the element marked with data-autofocus', async () => {
        const wrapper = mountOpen({
          default: '<input class="first" /><input class="wanted" data-autofocus />',
        })
        await nextTick()

        expect(document.activeElement).toBe(wrapper.find('.wanted').element)

        wrapper.unmount()
      })

      it('moves focus when opened later', async () => {
        const wrapper = mount(OsModal, {
          props: { open: false },
          attachTo: document.body,
        })
        await wrapper.setProps({ open: true })
        await nextTick()

        expect(document.activeElement).toBe(wrapper.find('[data-testid="os-modal-panel"]').element)

        wrapper.unmount()
      })

      it('does not move focus when closed again before the next tick', async () => {
        const wrapper = mountOpen()
        await wrapper.setProps({ open: false })
        await nextTick()

        expect(document.activeElement).toBe(trigger)

        wrapper.unmount()
      })
    })

    describe('focus on close', () => {
      it('returns focus to the previously focused element when closed', async () => {
        const wrapper = mountOpen()
        await nextTick()
        await wrapper.setProps({ open: false })

        expect(document.activeElement).toBe(trigger)

        wrapper.unmount()
      })

      it('returns focus to the previously focused element when unmounted while open', async () => {
        const wrapper = mountOpen()
        await nextTick()
        wrapper.unmount()

        expect(document.activeElement).toBe(trigger)
      })

      it('does not try to focus an element that left the document', async () => {
        const wrapper = mountOpen()
        await nextTick()
        trigger.remove()
        const focus = vi.spyOn(trigger, 'focus')
        await wrapper.setProps({ open: false })

        expect(focus).not.toHaveBeenCalled()

        wrapper.unmount()
      })
    })

    describe('focus trap', () => {
      it('wraps Tab on the last element to the first', async () => {
        const wrapper = mountOpen()
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const close = wrapper.find('[data-testid="os-modal-close"]').element as HTMLElement
        const confirm = wrapper.find('[data-testid="os-modal-confirm"]').element as HTMLElement
        confirm.focus()

        const event = pressTab(panel)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(close)

        wrapper.unmount()
      })

      it('wraps Shift+Tab on the first element to the last', async () => {
        const wrapper = mountOpen()
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const close = wrapper.find('[data-testid="os-modal-close"]').element as HTMLElement
        const confirm = wrapper.find('[data-testid="os-modal-confirm"]').element as HTMLElement
        close.focus()

        const event = pressTab(panel, true)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(confirm)

        wrapper.unmount()
      })

      it('keeps Shift+Tab from the focused panel inside the dialog', async () => {
        const wrapper = mountOpen()
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const confirm = wrapper.find('[data-testid="os-modal-confirm"]').element as HTMLElement

        const event = pressTab(panel, true)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(confirm)

        wrapper.unmount()
      })

      it('leaves Tab between inner elements to the browser', async () => {
        const wrapper = mountOpen()
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const cancel = wrapper.find('[data-testid="os-modal-cancel"]').element as HTMLElement
        cancel.focus()

        expect(pressTab(panel).defaultPrevented).toBe(false)
        expect(pressTab(panel, true).defaultPrevented).toBe(false)

        wrapper.unmount()
      })

      it('skips disabled controls when finding the last element', async () => {
        const wrapper = mountOpen({
          footer: '<button class="enabled">ok</button><button class="off" disabled>off</button>',
        })
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const close = wrapper.find('[data-testid="os-modal-close"]').element as HTMLElement
        ;(wrapper.find('.enabled').element as HTMLElement).focus()

        const event = pressTab(panel)

        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(close)

        wrapper.unmount()
      })

      it('ignores other keys', async () => {
        const wrapper = mountOpen()
        await nextTick()
        const panel = wrapper.find('[data-testid="os-modal-panel"]').element as HTMLElement
        const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
        panel.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)

        wrapper.unmount()
      })
    })
  })
})
