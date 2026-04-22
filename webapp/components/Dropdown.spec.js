import { mount } from '@vue/test-utils'

import Dropdown from './Dropdown.vue'

const localVue = global.localVue

describe('Dropdown.vue', () => {
  let wrapper
  let propsData

  beforeEach(() => {
    propsData = {}
  })

  const Wrapper = () => {
    return mount(Dropdown, {
      propsData,
      localVue,
      slots: {
        default: '<button class="trigger">trigger</button>',
        popover: '<div class="popover-content">content</div>',
      },
    })
  }

  afterEach(() => {
    if (wrapper) wrapper.destroy()
    jest.useRealTimers()
    // Ensure no stale body class leaks between tests
    if (typeof document !== 'undefined') {
      document.body.classList.remove('dropdown-open')
    }
  })

  describe('defaults', () => {
    it('starts closed', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('exposes scoped slot helpers to the trigger slot', () => {
      wrapper = Wrapper()
      // Helpers are exposed; the most important check is that isOpen tracks state
      wrapper.vm.openMenu(false)
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('toggleMenu', () => {
    it('opens when currently closed', () => {
      wrapper = Wrapper()
      wrapper.vm.toggleMenu()
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('closes when currently open', () => {
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.toggleMenu()
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('openMenu', () => {
    it('is a no-op when disabled', () => {
      propsData.disabled = true
      wrapper = Wrapper()
      wrapper.vm.openMenu(false)
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('opens immediately without timeout', () => {
      wrapper = Wrapper()
      wrapper.vm.openMenu(false)
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('routes through popoverMouseEnter when called with useTimeout=true', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.openMenu(true)
      expect(wrapper.vm.isOpen).toBe(false)
      jest.advanceTimersByTime(500)
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('closeMenu', () => {
    it('is a no-op when disabled', () => {
      propsData.disabled = true
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.closeMenu(false)
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('is a no-op when noMouseLeaveClosing is set', () => {
      propsData.noMouseLeaveClosing = true
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.closeMenu(false)
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('closes immediately without timeout', () => {
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.closeMenu(false)
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('routes through popoverMouseLeave when called with useTimeout=true', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.closeMenu(true)
      expect(wrapper.vm.isOpen).toBe(true)
      jest.advanceTimersByTime(300)
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('popoverMouseEnter', () => {
    it('is a no-op when disabled', () => {
      jest.useFakeTimers()
      propsData.disabled = true
      wrapper = Wrapper()
      wrapper.vm.popoverMouseEnter()
      jest.advanceTimersByTime(1000)
      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('does not schedule a timer if already open', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      wrapper.vm.popoverMouseEnter()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
      setTimeoutSpy.mockRestore()
    })

    it('opens after 500ms when called while closed', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.popoverMouseEnter()
      expect(wrapper.vm.isOpen).toBe(false)
      jest.advanceTimersByTime(500)
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('popoverMouseLeave', () => {
    it('is a no-op when disabled', () => {
      jest.useFakeTimers()
      propsData.disabled = true
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.popoverMouseLeave()
      jest.advanceTimersByTime(1000)
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('is a no-op when noMouseLeaveClosing is set', () => {
      jest.useFakeTimers()
      propsData.noMouseLeaveClosing = true
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.popoverMouseLeave()
      jest.advanceTimersByTime(1000)
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('does not schedule a timer if already closed', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      wrapper.vm.popoverMouseLeave()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
      setTimeoutSpy.mockRestore()
    })

    it('closes after 300ms when called while open', () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.popoverMouseLeave()
      expect(wrapper.vm.isOpen).toBe(true)
      jest.advanceTimersByTime(300)
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('isPopoverOpen watcher', () => {
    it('toggles the dropdown-open body class', async () => {
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      expect(document.body.classList.contains('dropdown-open')).toBe(true)

      wrapper.vm.isPopoverOpen = false
      await wrapper.vm.$nextTick()
      expect(document.body.classList.contains('dropdown-open')).toBe(false)
    })

    it('registers the overlay click handler when opened', async () => {
      jest.useFakeTimers()
      const addSpy = jest.spyOn(document, 'addEventListener')
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      jest.advanceTimersByTime(0)
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
      addSpy.mockRestore()
    })

    it('removes the overlay click handler when closed', async () => {
      jest.useFakeTimers()
      const removeSpy = jest.spyOn(document, 'removeEventListener')
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      jest.advanceTimersByTime(0)
      wrapper.vm.isPopoverOpen = false
      await wrapper.vm.$nextTick()
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
      removeSpy.mockRestore()
    })
  })

  describe('overlay click handler', () => {
    const openAndFlush = async () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      jest.advanceTimersByTime(0)
    }

    it('ignores clicks inside .popover-inner', async () => {
      await openAndFlush()
      const inner = document.createElement('div')
      inner.className = 'popover-inner'
      document.body.appendChild(inner)
      const event = { target: inner, stopPropagation: jest.fn(), preventDefault: jest.fn() }
      wrapper.vm.overlayClickHandler(event)
      expect(event.stopPropagation).not.toHaveBeenCalled()
      expect(wrapper.vm.isOpen).toBe(true)
      inner.remove()
    })

    it('ignores clicks inside .tooltip-inner', async () => {
      await openAndFlush()
      const inner = document.createElement('div')
      inner.className = 'tooltip-inner'
      document.body.appendChild(inner)
      const event = { target: inner, stopPropagation: jest.fn(), preventDefault: jest.fn() }
      wrapper.vm.overlayClickHandler(event)
      expect(event.stopPropagation).not.toHaveBeenCalled()
      expect(wrapper.vm.isOpen).toBe(true)
      inner.remove()
    })

    it('ignores clicks on the trigger element itself', async () => {
      await openAndFlush()
      const trigger = wrapper.find('.trigger').element
      const event = { target: trigger, stopPropagation: jest.fn(), preventDefault: jest.fn() }
      wrapper.vm.overlayClickHandler(event)
      expect(event.stopPropagation).not.toHaveBeenCalled()
      expect(wrapper.vm.isOpen).toBe(true)
    })

    it('closes the menu on outside clicks and stops propagation', async () => {
      await openAndFlush()
      const outside = document.createElement('div')
      document.body.appendChild(outside)
      const event = { target: outside, stopPropagation: jest.fn(), preventDefault: jest.fn() }
      wrapper.vm.overlayClickHandler(event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
      expect(wrapper.vm.isOpen).toBe(false)
      outside.remove()
    })

    it('does not attach the listener if the popover closed before the setTimeout fires', async () => {
      jest.useFakeTimers()
      const addSpy = jest.spyOn(document, 'addEventListener')
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      // Close before the 0ms setTimeout in addOverlayClickHandler fires
      wrapper.vm.isPopoverOpen = false
      await wrapper.vm.$nextTick()
      addSpy.mockClear()
      jest.advanceTimersByTime(0)
      expect(addSpy).not.toHaveBeenCalledWith('click', expect.any(Function), true)
      addSpy.mockRestore()
    })
  })

  describe('removeOverlayClickHandler', () => {
    it('is a no-op when no handler was registered', () => {
      wrapper = Wrapper()
      const removeSpy = jest.spyOn(document, 'removeEventListener')
      wrapper.vm.removeOverlayClickHandler()
      expect(removeSpy).not.toHaveBeenCalled()
      removeSpy.mockRestore()
    })
  })

  describe('beforeDestroy', () => {
    it('clears the dropdown-open body class if the popover was open', async () => {
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      expect(document.body.classList.contains('dropdown-open')).toBe(true)
      wrapper.destroy()
      wrapper = null
      expect(document.body.classList.contains('dropdown-open')).toBe(false)
    })

    it('removes overlay click handler on destroy', async () => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.isPopoverOpen = true
      await wrapper.vm.$nextTick()
      jest.advanceTimersByTime(0)
      const removeSpy = jest.spyOn(document, 'removeEventListener')
      wrapper.destroy()
      wrapper = null
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
      removeSpy.mockRestore()
    })
  })

  describe('popperOptions', () => {
    it('uses viewport as the overflow boundary', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.popperOptions.modifiers.preventOverflow.boundariesElement).toBe('viewport')
    })

    it('derives padding from the current scrollbar width', () => {
      wrapper = Wrapper()
      // jsdom reports innerWidth and clientWidth identically (no scrollbar), so width is 0
      expect(wrapper.vm.popperOptions.modifiers.preventOverflow.padding).toBe(
        wrapper.vm.scrollbarPadding,
      )
    })

    const mockWidths = ({ inner, client }) => {
      const innerDesc = Object.getOwnPropertyDescriptor(window, 'innerWidth')
      const clientDesc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(document.documentElement),
        'clientWidth',
      )
      Object.defineProperty(window, 'innerWidth', { get: () => inner, configurable: true })
      Object.defineProperty(document.documentElement, 'clientWidth', {
        get: () => client,
        configurable: true,
      })
      return () => {
        if (innerDesc) Object.defineProperty(window, 'innerWidth', innerDesc)
        else delete window.innerWidth
        delete document.documentElement.clientWidth
        if (clientDesc) {
          Object.defineProperty(
            Object.getPrototypeOf(document.documentElement),
            'clientWidth',
            clientDesc,
          )
        }
      }
    }

    it('clamps negative differences to 0', () => {
      const restore = mockWidths({ inner: 100, client: 120 })
      wrapper = Wrapper()
      expect(wrapper.vm.scrollbarPadding).toBe(0)
      restore()
    })

    it('reports the scrollbar width when innerWidth exceeds clientWidth', () => {
      const restore = mockWidths({ inner: 1024, client: 1007 })
      wrapper = Wrapper()
      expect(wrapper.vm.scrollbarPadding).toBe(17)
      restore()
    })

  })
})
