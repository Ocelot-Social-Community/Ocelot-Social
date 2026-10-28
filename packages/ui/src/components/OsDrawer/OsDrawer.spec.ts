import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'

import OsDrawer from './OsDrawer.vue'

const panelOf = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('[data-testid="os-drawer-panel"]')

describe('osDrawer', () => {
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.innerHTML = ''
  })

  describe('rendering', () => {
    it('keeps the panel in the page while closed, invisible and outside the viewport', () => {
      const wrapper = mount(OsDrawer, { slots: { default: '<p>Inside</p>' } })
      const panel = panelOf(wrapper)

      expect(panel.classes()).toContain('invisible')
      expect(panel.classes()).toContain('translate-x-full')
      expect(wrapper.find('[data-testid="os-drawer-backdrop"]').exists()).toBe(false)
    })

    it('shows the panel and a backdrop while open', () => {
      const wrapper = mount(OsDrawer, {
        props: { open: true },
        slots: { default: '<p>Inside</p>' },
      })
      const panel = panelOf(wrapper)

      expect(panel.classes()).toContain('visible')
      expect(panel.classes()).toContain('translate-x-0')
      expect(panel.classes()).not.toContain('translate-x-full')
      expect(wrapper.find('.os-drawer__content').text()).toBe('Inside')
      expect(wrapper.find('[data-testid="os-drawer-backdrop"]').exists()).toBe(true)
    })

    it('is visible at once when it opens and only slides, so the focus can land in it', () => {
      // At the start of a visibility transition an element is still hidden, and focus() on it
      // goes nowhere; only on closing does it hide, once it has slid out.
      const open = panelOf(mount(OsDrawer, { props: { open: true } })).classes()
      const closed = panelOf(mount(OsDrawer)).classes()

      expect(open).toContain('[transition:transform_200ms_ease-out]')
      expect(closed).toContain('[transition:transform_200ms_ease-out,visibility_0s_linear_200ms]')
    })

    it.each([
      ['right', 'right-0', 'translate-x-full'],
      ['left', 'left-0', '-translate-x-full'],
    ])('slides in from the %s', (side, edge, outside) => {
      const wrapper = mount(OsDrawer, { props: { side: side as 'left' | 'right' } })

      expect(panelOf(wrapper).classes()).toContain(edge)
      expect(panelOf(wrapper).classes()).toContain(outside)
    })

    it('passes class and attributes on to its root', () => {
      const wrapper = mount(OsDrawer, { attrs: { class: 'extra', id: 'drawer' } })

      expect(wrapper.classes()).toStrictEqual(
        expect.arrayContaining(['os-drawer-wrapper', 'extra']),
      )
      expect(wrapper.attributes('id')).toBe('drawer')
    })

    it('has a root without extra classes, too', () => {
      expect(mount(OsDrawer).classes()).toStrictEqual(['os-drawer-wrapper'])
    })
  })

  describe('content', () => {
    it('keeps its content alive when it opens and closes', async () => {
      // The backdrop comes and goes in front of the panel; without keys, the renderer would
      // turn the panel into the backdrop and build a new panel — remounting the content.
      let mounted = 0
      const Content = defineComponent({
        setup() {
          onMounted(() => {
            mounted += 1
          })
          return () => h('p', 'Inside')
        },
      })
      const wrapper = mount(OsDrawer, { slots: { default: () => h(Content) } })

      await wrapper.setProps({ open: true })
      await wrapper.setProps({ open: false })

      expect(mounted).toBe(1)
    })
  })

  describe('aria attributes', () => {
    it('is a modal dialog with a name', () => {
      const panel = panelOf(mount(OsDrawer, { props: { open: true, ariaLabel: 'Sidebar' } }))

      expect(panel.attributes('role')).toBe('dialog')
      expect(panel.attributes('aria-modal')).toBe('true')
      expect(panel.attributes('aria-label')).toBe('Sidebar')
    })

    it('names its close button', () => {
      const wrapper = mount(OsDrawer, { props: { open: true, closeLabel: 'Schließen' } })

      expect(wrapper.find('[data-testid="os-drawer-close"]').attributes('aria-label')).toBe(
        'Schließen',
      )
    })

    it('falls back to English names', () => {
      const wrapper = mount(OsDrawer, { props: { open: true } })

      expect(panelOf(wrapper).attributes('aria-label')).toBe('Drawer')
      expect(wrapper.find('[data-testid="os-drawer-close"]').attributes('aria-label')).toBe('Close')
    })
  })

  describe('closing', () => {
    it.each([
      [
        'close',
        async (wrapper: ReturnType<typeof mount>) =>
          wrapper.find('[data-testid="os-drawer-close"]').trigger('click'),
      ],
      [
        'backdrop',
        async (wrapper: ReturnType<typeof mount>) =>
          wrapper.find('[data-testid="os-drawer-backdrop"]').trigger('click'),
      ],
      [
        'escape',
        () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        },
      ],
    ])('closes by %s', async (type, act) => {
      const wrapper = mount(OsDrawer, { props: { open: true }, attachTo: document.body })

      await act(wrapper)

      expect(wrapper.emitted('update:open')).toStrictEqual([[false]])
      expect(wrapper.emitted('close')).toStrictEqual([[type]])

      wrapper.unmount()
    })

    it('ignores Escape while closed', () => {
      const wrapper = mount(OsDrawer, { attachTo: document.body })
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(wrapper.emitted('close')).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe('body scroll lock', () => {
    it('holds the page still while open', async () => {
      const wrapper = mount(OsDrawer, { props: { open: true } })

      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ open: false })

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('keyboard accessibility', () => {
    const opener = () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      button.focus()
      return button
    }

    it('takes the focus when it opens, and says so', async () => {
      opener()
      const wrapper = mount(OsDrawer, { attachTo: document.body })

      await wrapper.setProps({ open: true })
      await nextTick()

      expect(document.activeElement).toBe(panelOf(wrapper).element)
      expect(wrapper.emitted('opened')).toHaveLength(1)
    })

    it('gives the focus back to where it was when it closes', async () => {
      const button = opener()
      const wrapper = mount(OsDrawer, { attachTo: document.body })
      await wrapper.setProps({ open: true })
      await nextTick()

      await wrapper.setProps({ open: false })

      expect(document.activeElement).toBe(button)
    })

    it('does not reach for an element that has left the page', async () => {
      const button = opener()
      const wrapper = mount(OsDrawer, { attachTo: document.body })
      await wrapper.setProps({ open: true })
      await nextTick()
      button.remove()

      await wrapper.setProps({ open: false })

      expect(document.activeElement).not.toBe(button)
    })

    it('keeps Tab inside the open drawer', async () => {
      const wrapper = mount(OsDrawer, {
        props: { open: true },
        slots: { default: '<a href="#">Link</a>' },
        attachTo: document.body,
      })
      const close = wrapper.find('[data-testid="os-drawer-close"]').element as HTMLElement
      const link = wrapper.find('a').element as HTMLElement
      // Opening moves the focus to the panel first.
      await nextTick()

      link.focus()
      await panelOf(wrapper).trigger('keydown', { key: 'Tab' })

      expect(document.activeElement).toBe(close)

      await panelOf(wrapper).trigger('keydown', { key: 'Tab', shiftKey: true })

      expect(document.activeElement).toBe(link)

      wrapper.unmount()
    })

    it('keeps the closed drawer out of reach', () => {
      // `invisible` (visibility: hidden) takes the panel and its buttons out of the tab order
      // and the accessibility tree; jsdom does not compute it, so the class is what is checked.
      const wrapper = mount(OsDrawer)

      expect(panelOf(wrapper).classes()).toContain('invisible')
    })
  })
})
