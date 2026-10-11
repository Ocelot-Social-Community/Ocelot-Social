import { mount } from '@vue/test-utils'
import warnBeforeUnload from './warnBeforeUnload'

const localVue = global.localVue

const Wrapper = (methods = {}) =>
  mount({ mixins: [warnBeforeUnload], methods, render: (h) => h('div') }, { localVue })

const unload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('warnBeforeUnload', () => {
  it('has the browser ask before the page is left with unsaved changes', () => {
    const wrapper = Wrapper({ hasUnsavedChanges: () => true })

    expect(unload().defaultPrevented).toBe(true)
    wrapper.destroy()
  })

  it('lets the page go without unsaved changes', () => {
    const wrapper = Wrapper({ hasUnsavedChanges: () => false })

    expect(unload().defaultPrevented).toBe(false)
    wrapper.destroy()
  })

  it('lets the page go when the host never implemented hasUnsavedChanges', () => {
    const wrapper = Wrapper()

    expect(unload().defaultPrevented).toBe(false)
    wrapper.destroy()
  })

  // A page that is gone must not keep blocking the tab from closing.
  it('stops listening once the page is destroyed', () => {
    const wrapper = Wrapper({ hasUnsavedChanges: () => true })
    wrapper.destroy()

    expect(unload().defaultPrevented).toBe(false)
  })
})
