import { mount } from '@vue/test-utils'
import confirmLeaveIfUnsavedChanges from './confirmLeaveIfUnsavedChanges'

const localVue = global.localVue

const Wrapper = (hasUnsavedChanges) => {
  return mount(
    {
      mixins: [confirmLeaveIfUnsavedChanges],
      methods: { hasUnsavedChanges },
      render: (h) => h('div'),
    },
    { localVue },
  )
}

describe('confirmLeaveIfUnsavedChanges', () => {
  describe('beforeRouteLeave', () => {
    it('navigates straight through when there are no unsaved changes', () => {
      const wrapper = Wrapper(() => false)
      const next = jest.fn()

      wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

      expect(next).toHaveBeenCalledWith()
      expect(wrapper.vm.showLeaveConfirmModal).toBe(false)
    })

    it('holds the navigation and opens the confirm modal when there are unsaved changes', () => {
      const wrapper = Wrapper(() => true)
      const next = jest.fn()

      wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

      expect(next).not.toHaveBeenCalled()
      expect(wrapper.vm.showLeaveConfirmModal).toBe(true)
    })

    // The page embedding this mixin must implement its own hasUnsavedChanges
    // — a page that never got around to it should still navigate (fail
    // open, not silently block every navigation).
    it('navigates straight through if the host page never implemented hasUnsavedChanges', () => {
      const wrapper = mount(
        { mixins: [confirmLeaveIfUnsavedChanges], render: (h) => h('div') },
        { localVue },
      )
      const next = jest.fn()

      wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('resolvePendingNavigation', () => {
    it('lets the navigation continue when the user chooses to discard', () => {
      const wrapper = Wrapper(() => true)
      const next = jest.fn()
      wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

      wrapper.vm.leaveConfirmModalData.buttons.confirm.callback()

      expect(next).toHaveBeenCalledWith(undefined)
      expect(wrapper.vm.showLeaveConfirmModal).toBe(false)
      expect(wrapper.vm.pendingNavigation).toBeNull()
    })

    it('cancels the navigation (next(false)) when the user chooses to stay', () => {
      const wrapper = Wrapper(() => true)
      const next = jest.fn()
      wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)

      wrapper.vm.leaveConfirmModalData.buttons.cancel.callback()

      expect(next).toHaveBeenCalledWith(false)
      expect(wrapper.vm.showLeaveConfirmModal).toBe(false)
      expect(wrapper.vm.pendingNavigation).toBeNull()
    })
  })
})
