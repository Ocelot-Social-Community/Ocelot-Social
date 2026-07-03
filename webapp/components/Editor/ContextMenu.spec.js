import { shallowMount } from '@vue/test-utils'
import tippy from 'tippy.js'
import ContextMenu from './ContextMenu.vue'

jest.mock('tippy.js', () => jest.fn())

const localVue = global.localVue

describe('ContextMenu', () => {
  let menu
  let observerInstances

  const makeMenu = () => ({
    show: jest.fn(),
    destroy: jest.fn(),
    popperInstance: { scheduleUpdate: jest.fn() },
  })

  const Wrapper = () => shallowMount(ContextMenu, { localVue })

  beforeEach(() => {
    menu = makeMenu()
    tippy.mockReset()
    tippy.mockReturnValue(menu)
    observerInstances = []
    global.MutationObserver = jest.fn().mockImplementation((cb) => {
      const inst = { observe: jest.fn(), disconnect: jest.fn(), trigger: cb }
      observerInstances.push(inst)
      return inst
    })
  })

  describe('displayContextMenu', () => {
    it('uses click + right placement for links', () => {
      const wrapper = Wrapper()
      const target = document.createElement('a')
      const content = document.createElement('div')
      wrapper.vm.displayContextMenu(target, content, 'link')
      const [el, opts] = tippy.mock.calls[0]
      expect(el).toBe(target)
      expect(opts.placement).toBe('right')
      expect(opts.trigger).toBe('click')
      expect(menu.show).toHaveBeenCalled()
    })

    it('uses mouseenter + top-start placement for non-links', () => {
      const wrapper = Wrapper()
      wrapper.vm.displayContextMenu(
        document.createElement('span'),
        document.createElement('div'),
        'hashtag',
      )
      const opts = tippy.mock.calls[0][1]
      expect(opts.placement).toBe('top-start')
      expect(opts.trigger).toBe('mouseenter')
    })

    it('does nothing when a menu is already open', () => {
      const wrapper = Wrapper()
      wrapper.vm.menu = menu
      wrapper.vm.displayContextMenu(
        document.createElement('a'),
        document.createElement('div'),
        'link',
      )
      expect(tippy).not.toHaveBeenCalled()
    })

    it('focuses an input inside the popper on mount', () => {
      const wrapper = Wrapper()
      wrapper.vm.displayContextMenu(
        document.createElement('a'),
        document.createElement('div'),
        'link',
      )
      const { onMount } = tippy.mock.calls[0][1]
      const focus = jest.fn()
      onMount({ popper: { querySelector: () => ({ focus }) } })
      expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    })

    it('tolerates a popper without an input on mount', () => {
      const wrapper = Wrapper()
      wrapper.vm.displayContextMenu(
        document.createElement('a'),
        document.createElement('div'),
        'link',
      )
      const { onMount } = tippy.mock.calls[0][1]
      expect(() => onMount({ popper: { querySelector: () => null } })).not.toThrow()
    })

    it('observes the content and reschedules the popper on mutation', () => {
      const wrapper = Wrapper()
      const content = document.createElement('div')
      wrapper.vm.displayContextMenu(document.createElement('a'), content, 'link')
      expect(observerInstances).toHaveLength(1)
      expect(observerInstances[0].observe).toHaveBeenCalledWith(content, {
        childList: true,
        subtree: true,
        characterData: true,
      })
      observerInstances[0].trigger()
      expect(menu.popperInstance.scheduleUpdate).toHaveBeenCalled()
    })
  })

  describe('hideContextMenu', () => {
    it('destroys the menu and disconnects the observer', () => {
      const wrapper = Wrapper()
      wrapper.vm.displayContextMenu(
        document.createElement('a'),
        document.createElement('div'),
        'link',
      )
      const observer = observerInstances[0]
      wrapper.vm.hideContextMenu()
      expect(menu.destroy).toHaveBeenCalled()
      expect(wrapper.vm.menu).toBeNull()
      expect(observer.disconnect).toHaveBeenCalled()
    })

    it('is a no-op when nothing is open', () => {
      const wrapper = Wrapper()
      expect(() => wrapper.vm.hideContextMenu()).not.toThrow()
    })
  })
})
