import { mount } from '@vue/test-utils'

import ConfirmModal from './ConfirmModal.vue'
import { postMenuModalsData } from '~/components/utils/PostHelpers'

const localVue = global.localVue

const CONFIRM = '[data-testid="os-confirm-dialog-confirm"]'
const CANCEL = '[data-testid="os-confirm-dialog-cancel"]'
const CLOSE = '[data-testid="os-modal-close"]'

describe('ConfirmModal.vue', () => {
  let wrapper
  let propsData
  let mocks
  const postName = 'It is a post'
  let confirmCallback
  let cancelCallback

  const Wrapper = () => mount(ConfirmModal, { propsData, mocks, localVue, attachTo: document.body })

  beforeEach(() => {
    confirmCallback = jest.fn()
    cancelCallback = jest.fn()
    propsData = {
      modalData: postMenuModalsData(postName, confirmCallback, cancelCallback).delete,
    }
    mocks = {
      // Mirrors the real translation, which carries markup around the interpolated name
      $t: jest.fn((key, params) =>
        key === 'delete.contribution.message' ? `Delete the post “<b>${params.name}</b>”?` : key,
      ),
    }
  })

  afterEach(() => {
    if (wrapper) wrapper.destroy()
    wrapper = null
  })

  describe('rendering', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('is an accessible dialog labelled by the translated title', () => {
      const panel = wrapper.find('.os-modal')
      expect(panel.attributes('role')).toBe('dialog')
      expect(panel.attributes('aria-modal')).toBe('true')
      const title = wrapper.find(`#${panel.attributes('aria-labelledby')}`)
      expect(title.text()).toBe('delete.contribution.title')
    })

    it('keeps the e2e hook on its root', () => {
      expect(wrapper.attributes('data-test')).toBe('confirm-modal')
    })

    it('translates the message with its params', () => {
      expect(mocks.$t).toHaveBeenCalledWith('delete.contribution.message', { name: postName })
    })

    it('renders the markup of the translation', () => {
      expect(wrapper.find('.os-modal__content b').text()).toBe(postName)
    })

    it('translates the button labels and the close button', () => {
      expect(wrapper.find(CONFIRM).text()).toBe('delete.submit')
      expect(wrapper.find(CANCEL).text()).toBe('delete.cancel')
      expect(wrapper.find(CLOSE).attributes('aria-label')).toBe('actions.close')
    })

    it('shows the button icons', () => {
      expect(wrapper.find(`${CONFIRM} .os-button__icon svg`).exists()).toBe(true)
      expect(wrapper.find(`${CANCEL} .os-button__icon svg`).exists()).toBe(true)
    })

    it('moves focus to the safe choice: cancel', async () => {
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(wrapper.find(CANCEL).element)
    })

    it('marks a destructive action: red confirm, neutral cancel', () => {
      expect(wrapper.find(CONFIRM).attributes('data-variant')).toBe('danger')
      expect(wrapper.find(CANCEL).attributes('data-variant')).toBe('primary')
    })
  })

  describe('non-destructive action', () => {
    it('shows a primary confirm and a red cancel button', () => {
      propsData.modalData.buttons.confirm.danger = false
      wrapper = Wrapper()

      expect(wrapper.find(CONFIRM).attributes('data-variant')).toBe('primary')
      expect(wrapper.find(CANCEL).attributes('data-variant')).toBe('danger')
    })
  })

  describe('message without params', () => {
    it('translates the ident alone', () => {
      delete propsData.modalData.messageParams
      propsData.modalData.messageIdent = 'actions.unsavedChanges.message'
      wrapper = Wrapper()

      expect(mocks.$t).toHaveBeenCalledWith('actions.unsavedChanges.message', undefined)
    })
  })

  describe('params with markup', () => {
    it('escapes them, so user content is never interpreted as HTML', () => {
      propsData.modalData.messageParams = {
        name: '<img src=x onerror="alert(1)">Tom & Jerry',
        count: 3,
      }
      wrapper = Wrapper()

      expect(mocks.$t).toHaveBeenCalledWith('delete.contribution.message', {
        name: '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;Tom &amp; Jerry',
        count: 3,
      })
      expect(wrapper.find('.os-modal__content img').exists()).toBe(false)
      expect(wrapper.find('.os-modal__content b').text()).toBe(
        '<img src=x onerror="alert(1)">Tom & Jerry',
      )
    })
  })

  describe('confirm', () => {
    it('shows loading while the callback runs, then closes at once', async () => {
      let resolve
      confirmCallback.mockReturnValue(new Promise((r) => (resolve = r)))
      wrapper = Wrapper()

      await wrapper.find(CONFIRM).trigger('click')

      expect(confirmCallback).toHaveBeenCalledTimes(1)
      expect(wrapper.find(CONFIRM).attributes('aria-busy')).toBe('true')
      expect(wrapper.find(CANCEL).attributes('disabled')).toBeDefined()
      expect(wrapper.emitted().close).toBeUndefined()

      resolve()
      await new Promise(process.nextTick)

      expect(wrapper.emitted().close).toHaveLength(1)
      expect(wrapper.find('.os-modal').exists()).toBe(false)
      expect(cancelCallback).not.toHaveBeenCalled()
    })

    it('closes as well when the callback fails', async () => {
      confirmCallback.mockRejectedValue(new Error('nope'))
      wrapper = Wrapper()

      await wrapper.find(CONFIRM).trigger('click')
      await new Promise(process.nextTick)

      expect(wrapper.emitted().close).toHaveLength(1)
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('cancel', () => {
    it.each([
      ['the cancel button', (w) => w.find(CANCEL).trigger('click')],
      ['the close button', (w) => w.find(CLOSE).trigger('click')],
      ['Escape', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ])('runs the cancel callback and closes on %s', async (_, act) => {
      wrapper = Wrapper()

      await act(wrapper)
      await new Promise(process.nextTick)

      expect(cancelCallback).toHaveBeenCalledTimes(1)
      expect(confirmCallback).not.toHaveBeenCalled()
      expect(wrapper.emitted().close).toHaveLength(1)
      expect(wrapper.find('.os-modal').exists()).toBe(false)
    })
  })
})
