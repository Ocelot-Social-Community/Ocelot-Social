import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { IconCheck, IconClose } from '#src/components/OsIcon'

import OsConfirmDialog from './OsConfirmDialog.vue'

const CONFIRM = '[data-testid="os-confirm-dialog-confirm"]'
const CANCEL = '[data-testid="os-confirm-dialog-cancel"]'
const CLOSE = '[data-testid="os-modal-close"]'
const PANEL = '[data-testid="os-modal-panel"]'

describe('osConfirmDialog', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  describe('rendering', () => {
    it('renders nothing but the empty modal wrapper when closed', () => {
      const wrapper = mount(OsConfirmDialog, { props: { title: 'Delete?' } })

      expect(wrapper.find(PANEL).exists()).toBe(false)
      expect(wrapper.classes()).toStrictEqual(
        expect.arrayContaining(['os-modal-wrapper', 'os-confirm-dialog']),
      )
    })

    it('renders title and plain-text message when open', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true, title: 'Delete post?', message: 'This <b>cannot</b> be undone.' },
      })

      expect(wrapper.find('.os-modal__title').text()).toBe('Delete post?')

      const message = wrapper.find('.os-confirm-dialog__message')

      // Plain text: markup in the prop is shown, never interpreted
      expect(message.text()).toBe('This <b>cannot</b> be undone.')
      expect(message.find('b').exists()).toBe(false)
    })

    it('renders the default slot instead of the message', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true, title: 'Delete?', message: 'ignored' },
        slots: { default: '<p class="rich">Delete <strong>Alice</strong>?</p>' },
      })

      expect(wrapper.find('.rich strong').text()).toBe('Alice')
      expect(wrapper.find('.os-confirm-dialog__message').exists()).toBe(false)
    })

    it('renders an empty body without message and slot', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true, title: 'Sure?' } })

      expect(wrapper.find('.os-modal__content').text()).toBe('')
    })

    it('passes attributes to the root element', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true },
        attrs: { 'data-test': 'confirm-modal' },
      })

      expect(wrapper.attributes('data-test')).toBe('confirm-modal')
    })
  })

  describe('labels', () => {
    it('falls back to English defaults', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      expect(wrapper.find(CONFIRM).text()).toBe('Confirm')
      expect(wrapper.find(CANCEL).text()).toBe('Cancel')
      expect(wrapper.find(CLOSE).attributes('aria-label')).toBe('Close')
    })

    it('uses the given labels', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: {
          open: true,
          confirmLabel: 'Löschen',
          cancelLabel: 'Abbrechen',
          closeLabel: 'Schließen',
        },
      })

      expect(wrapper.find(CONFIRM).text()).toBe('Löschen')
      expect(wrapper.find(CANCEL).text()).toBe('Abbrechen')
      expect(wrapper.find(CLOSE).attributes('aria-label')).toBe('Schließen')
    })
  })

  describe('variant', () => {
    it('default: primary confirm, red outlined cancel', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      expect(wrapper.find(CONFIRM).attributes('data-variant')).toBe('primary')
      expect(wrapper.find(CONFIRM).attributes('data-appearance')).toBe('filled')
      expect(wrapper.find(CANCEL).attributes('data-variant')).toBe('danger')
      expect(wrapper.find(CANCEL).attributes('data-appearance')).toBe('outline')
    })

    it('danger: red confirm, neutral primary outlined cancel', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true, variant: 'danger' } })

      expect(wrapper.find(CONFIRM).attributes('data-variant')).toBe('danger')
      expect(wrapper.find(CONFIRM).attributes('data-appearance')).toBe('filled')
      expect(wrapper.find(CANCEL).attributes('data-variant')).toBe('primary')
      expect(wrapper.find(CANCEL).attributes('data-appearance')).toBe('outline')
    })
  })

  describe('icons', () => {
    it('renders no button icons by default', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      expect(wrapper.find(`${CONFIRM} .os-button__icon`).exists()).toBe(false)
      expect(wrapper.find(`${CANCEL} .os-button__icon`).exists()).toBe(false)
    })

    it('renders the given icons in the buttons', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true, confirmIcon: IconCheck, cancelIcon: IconClose },
      })

      expect(wrapper.find(`${CONFIRM} .os-button__icon svg`).exists()).toBe(true)
      expect(wrapper.find(`${CANCEL} .os-button__icon svg`).exists()).toBe(true)
    })
  })

  describe('events', () => {
    it('emits confirm without closing itself', async () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      await wrapper.find(CONFIRM).trigger('click')

      expect(wrapper.emitted('confirm')).toHaveLength(1)
      expect(wrapper.emitted('update:open')).toBeUndefined()
      expect(wrapper.emitted('cancel')).toBeUndefined()
    })

    it('emits cancel and update:open false on the cancel button', async () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      await wrapper.find(CANCEL).trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('emits cancel on the close button', async () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      await wrapper.find(CLOSE).trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
    })

    it('emits cancel on a backdrop click', async () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true } })

      await wrapper.find('.os-modal__overlay').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
    })
  })

  describe('loading', () => {
    it('shows the busy confirm button and disables both buttons', () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true, loading: true } })

      expect(wrapper.find(CONFIRM).attributes('aria-busy')).toBe('true')
      expect(wrapper.find(CONFIRM).attributes('disabled')).toBeDefined()
      expect(wrapper.find(CANCEL).attributes('disabled')).toBeDefined()
    })

    it('ignores cancelling via close button and backdrop', async () => {
      const wrapper = mount(OsConfirmDialog, { props: { open: true, loading: true } })

      await wrapper.find(CLOSE).trigger('click')
      await wrapper.find('.os-modal__overlay').trigger('click')

      expect(wrapper.emitted('cancel')).toBeUndefined()
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })
  })

  describe('keyboard accessibility', () => {
    it('focuses the cancel button for a destructive action', async () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true, variant: 'danger' },
        attachTo: document.body,
      })
      await nextTick()

      expect(document.activeElement).toBe(wrapper.find(CANCEL).element)

      wrapper.unmount()
    })

    it('focuses the confirm button otherwise', async () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true },
        attachTo: document.body,
      })
      await nextTick()

      expect(document.activeElement).toBe(wrapper.find(CONFIRM).element)

      wrapper.unmount()
    })

    it('cancels on Escape', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true },
        attachTo: document.body,
      })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])

      wrapper.unmount()
    })

    it('ignores Escape while loading', () => {
      const wrapper = mount(OsConfirmDialog, {
        props: { open: true, loading: true },
        attachTo: document.body,
      })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(wrapper.emitted('cancel')).toBeUndefined()

      wrapper.unmount()
    })
  })
})
