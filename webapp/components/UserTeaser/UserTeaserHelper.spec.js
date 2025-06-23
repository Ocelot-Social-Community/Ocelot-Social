import { render, waitFor, fireEvent } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import UserTeaserHelper from './UserTeaserHelper.vue'

const localVue = global.localVue

const userLink = {
  name: 'profile-id-slug',
  params: { slug: 'slug', id: 'id' },
}

let mockIsTouchDevice

jest.mock('../utils/isTouchDevice', () => ({
  isTouchDevice: jest.fn(() => mockIsTouchDevice),
}))

describe('UserTeaserHelper', () => {
  const Wrapper = ({
    withLinkToProfile = true,
    onTouchScreen = false,
    withPopoverEnabled = true,
    hoverDelay = 500,
  }) => {
    mockIsTouchDevice = onTouchScreen

    return render(UserTeaserHelper, {
      localVue,
      propsData: {
        userLink,
        linkToProfile: withLinkToProfile,
        showPopover: withPopoverEnabled,
        hoverDelay: hoverDelay,
      },
      stubs: {
        NuxtLink: RouterLinkStub,
      },
      slots: {
        default: '<div>Test Content</div>',
      },
    })
  }

  // Helper function for tests that need timers
  const withFakeTimers = (testFn) => {
    return async () => {
      jest.useFakeTimers()
      try {
        await testFn()
      } finally {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
      }
    }
  }

  describe('hover delay functionality', () => {
    it(
      'should emit open-menu after hover delay on desktop',
      withFakeTimers(async () => {
        const wrapper = Wrapper({
          withLinkToProfile: true,
          onTouchScreen: false,
          withPopoverEnabled: true,
          hoverDelay: 1000,
        })

        // Find the NuxtLink stub element
        const link = wrapper.container.firstChild
        expect(link).toBeTruthy()

        // Trigger mouseenter
        fireEvent.mouseEnter(link)

        // Menu should not be opened yet
        expect(wrapper.emitted()['open-menu']).toBeFalsy()

        // Advance time
        jest.advanceTimersByTime(1000)

        // Now open-menu should have been emitted
        await waitFor(() => {
          expect(wrapper.emitted()['open-menu']).toBeTruthy()
          expect(wrapper.emitted()['open-menu']).toHaveLength(1)
        })
      }),
    )

    it(
      'should not emit open-menu if mouse leaves before delay',
      withFakeTimers(async () => {
        const wrapper = Wrapper({
          withLinkToProfile: true,
          onTouchScreen: false,
          withPopoverEnabled: true,
          hoverDelay: 1000,
        })

        const link = wrapper.container.firstChild

        // Mouseenter + mouseleave
        fireEvent.mouseEnter(link)
        jest.advanceTimersByTime(500)
        fireEvent.mouseLeave(link)

        // Let the rest of the time pass
        jest.advanceTimersByTime(500)

        // open-menu should not have been emitted
        expect(wrapper.emitted()['open-menu']).toBeFalsy()
        // But close-menu should have been emitted
        expect(wrapper.emitted()['close-menu']).toBeTruthy()
        expect(wrapper.emitted()['close-menu']).toHaveLength(1)
      }),
    )

    it('should emit open-menu immediately on touch device button click', async () => {
      const wrapper = Wrapper({
        withLinkToProfile: true,
        onTouchScreen: true,
        withPopoverEnabled: true,
      })

      const button = wrapper.container.querySelector('button')
      expect(button).toBeTruthy()

      // Click on button
      fireEvent.click(button)

      // Should be emitted immediately, without timer
      expect(wrapper.emitted()['open-menu']).toBeTruthy()
      expect(wrapper.emitted()['open-menu']).toHaveLength(1)
    })
  })

  describe('with linkToProfile and popover enabled, on touch screen', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: true, withPopoverEnabled: true })
    })

    it('renders button', () => {
      expect(wrapper.container.querySelector('button')).toBeTruthy()
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('without linkToProfile', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: false, onTouchScreen: false })
    })

    it('renders span', () => {
      expect(wrapper.container.querySelector('span')).toBeTruthy()
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('with linkToProfile, on desktop', () => {
    let wrapper
    beforeEach(() => {
      wrapper = Wrapper({ withLinkToProfile: true, onTouchScreen: false })
    })

    it('renders link', () => {
      const routerLinkStub = wrapper.container.firstChild
      expect(routerLinkStub).toBeTruthy()
      expect(routerLinkStub.tagName).toBeTruthy()
      expect(wrapper.container).toMatchSnapshot()
    })
  })

  describe('timer cleanup', () => {
    it(
      'should clear timer on component unmount',
      withFakeTimers(async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

        const wrapper = Wrapper({
          withLinkToProfile: true,
          onTouchScreen: false,
          withPopoverEnabled: true,
          hoverDelay: 5000,
        })

        // Start hover timer
        fireEvent.mouseEnter(wrapper.container.firstChild)

        // Unmount while timer is running
        wrapper.unmount()

        // clearTimeout should have been called
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
      }),
    )
  })

  describe('popover behavior without showPopover', () => {
    it('should not emit events when showPopover is false', () => {
      const wrapper = Wrapper({
        withLinkToProfile: true,
        onTouchScreen: false,
        withPopoverEnabled: false,
      })

      const link = wrapper.container.firstChild

      fireEvent.mouseEnter(link)
      fireEvent.mouseLeave(link)

      expect(wrapper.emitted()['open-menu']).toBeUndefined()
      expect(wrapper.emitted()['close-menu']).toBeUndefined()
    })
  })
})
