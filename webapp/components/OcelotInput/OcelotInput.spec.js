import { mount } from '@vue/test-utils'

import OcelotInput from './OcelotInput.vue'

const localVue = global.localVue

describe('OcelotInput', () => {
  let wrappers

  beforeEach(() => {
    wrappers = []
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.destroy())
  })

  // Attached to the document on purpose: jsdom refuses focus to a detached element, so a focus
  // assertion against a free-floating wrapper passes or fails for the wrong reason.
  const Wrapper = (propsData = {}) => {
    const wrapper = mount(OcelotInput, { localVue, propsData, attachTo: document.body })
    wrappers.push(wrapper)
    return wrapper
  }

  it('reports what was typed, so v-model works at the call site', () => {
    const wrapper = Wrapper({ value: '' })

    wrapper.find('input').setValue('Guests')

    expect(wrapper.emitted('input')).toEqual([['Guests']])
  })

  it('focuses its own control when the call site asks', () => {
    // The field is often inserted on demand — an inline rename, a "new role" box — and the call
    // site holds a ref to THIS component, not to the input. Without the method, `.focus()` would
    // land on the component instance and do nothing; `autofocus` is not a substitute, it only
    // fires reliably on a document's first load. Named `focusControl` because `focus` is already
    // the data flag behind the focused styling.
    const wrapper = Wrapper({ value: '' })

    wrapper.vm.focusControl()

    expect(document.activeElement).toBe(wrapper.find('input').element)
  })

  it('renders a textarea when asked, and focuses that one too', () => {
    const wrapper = Wrapper({ value: '', type: 'textarea' })

    wrapper.vm.focusControl()

    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('textarea').element)
  })

  it('passes a length limit on to the control, and sets none without one', () => {
    expect(Wrapper({ maxlength: 280 }).find('input').attributes('maxlength')).toBe('280')
    expect(Wrapper().find('input').attributes('maxlength')).toBeUndefined()
  })

  it('shows the label only when there is one', () => {
    expect(Wrapper({ value: '' }).find('.ds-input-label').isVisible()).toBe(false)
    expect(Wrapper({ value: '', label: 'Name' }).find('.ds-input-label').isVisible()).toBe(true)
  })
})
