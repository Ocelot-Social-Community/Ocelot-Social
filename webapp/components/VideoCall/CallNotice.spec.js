import { mount } from '@vue/test-utils'
import CallNotice from './CallNotice.vue'

const factory = (propsData) =>
  mount(CallNotice, {
    propsData,
    stubs: { OsIcon: { name: 'OsIcon', props: ['icon'], template: '<i class="stub-icon" />' } },
  })

describe('CallNotice', () => {
  it('says what is the matter, and leaves announcing it to the live region it is placed in', () => {
    const wrapper = factory({ message: 'Connection lost' })
    expect(wrapper.text()).toBe('Connection lost')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.classes()).toContain('call-notice--info')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('.stub-icon').exists()).toBe(false)
  })

  it('marks a warning as one', () => {
    const wrapper = factory({ message: 'No sound', tone: 'warning' })
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.classes()).toContain('call-notice--warning')
    // Said by an icon, not by the colour alone.
    const icon = wrapper.findComponent({ name: 'OsIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('icon')).toBeTruthy()
  })

  it('accepts only the tones it knows', () => {
    const { validator } = CallNotice.props.tone
    expect(validator('info')).toBe(true)
    expect(validator('warning')).toBe(true)
    expect(validator('danger')).toBe(false)
  })

  it('carries its actions as links within the sentence, and reports a click by key', async () => {
    const wrapper = factory({
      message: 'Your device is struggling.',
      actions: [
        { key: 'lower', label: 'Lower quality', dataTest: 'lower' },
        { key: 'dismiss', label: 'Dismiss', dataTest: 'dismiss' },
      ],
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons.at(0).attributes('type')).toBe('button')
    expect(wrapper.text()).toMatch(/^Your device is struggling\.\s+Lower quality\s+·\s+Dismiss$/)
    // A choice gets a line of its own.
    expect(wrapper.find('.call-notice__actions').classes()).toContain(
      'call-notice__actions--own-line',
    )
    // The separator is for the eye only.
    expect(wrapper.find('[aria-hidden="true"]').text()).toBe('·')
    await wrapper.find('[data-test="dismiss"]').trigger('click')
    await wrapper.find('[data-test="lower"]').trigger('click')
    expect(wrapper.emitted('action')).toEqual([['dismiss'], ['lower']])
  })

  it('lets a single action read on as part of the sentence', () => {
    const wrapper = factory({
      message: 'Weak connection.',
      actions: [{ key: 'show', label: 'Show videos' }],
    })
    expect(wrapper.find('.call-notice__actions').classes()).not.toContain(
      'call-notice__actions--own-line',
    )
  })

  it('keeps an action unusable while it is disabled', () => {
    const wrapper = factory({
      message: 'Coarse cameras.',
      actions: [{ key: 'restore', label: 'Restore', disabled: true }],
    })
    expect(wrapper.find('button').attributes('disabled')).toBe('disabled')
  })
})
