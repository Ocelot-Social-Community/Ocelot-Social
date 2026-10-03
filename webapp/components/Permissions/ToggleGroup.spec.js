import { mount } from '@vue/test-utils'

import ToggleGroup from './ToggleGroup.vue'

const localVue = global.localVue

const ITEMS = [
  { value: 'public', label: 'Public', testId: 'option-public' },
  { value: 'closed', label: 'Closed', testId: 'option-closed' },
  { value: 'hidden', label: 'Secret', testId: 'option-hidden' },
]

describe('ToggleGroup', () => {
  const Wrapper = (propsData = {}, scopedSlots = {}) =>
    mount(ToggleGroup, {
      localVue,
      propsData: { items: ITEMS, value: 'public', label: 'Template', ...propsData },
      scopedSlots,
    })
  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  it('is one choice among several, said as such', () => {
    const wrapper = Wrapper()

    // Toggle buttons rather than radios: native buttons, so the keyboard works as announced —
    // a radiogroup promises arrow keys and a single tab stop it would not deliver.
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('Template')
    expect(at(wrapper, 'option-public').attributes('aria-pressed')).toBe('true')
    expect(at(wrapper, 'option-closed').attributes('aria-pressed')).toBe('false')
  })

  it('fills the current one and outlines the rest', () => {
    const wrapper = Wrapper()

    expect(at(wrapper, 'option-public').classes()).toContain('toggle-group__item--active')
    expect(at(wrapper, 'option-public').attributes('data-appearance')).toBe('filled')
    expect(at(wrapper, 'option-closed').attributes('data-appearance')).toBe('outline')
  })

  it('reports a pick and the button under the cursor', async () => {
    const wrapper = Wrapper()

    await at(wrapper, 'option-closed').trigger('click')
    await at(wrapper, 'option-closed').trigger('mouseenter')
    await at(wrapper, 'option-closed').trigger('mouseleave')

    expect(wrapper.emitted('select')).toEqual([['closed']])
    expect(wrapper.emitted('hover')).toEqual([['closed'], [null]])
  })

  it('lets a row add to its buttons', () => {
    const wrapper = Wrapper({}, { extra: '<em class="extra">{{ props.item.value }}</em>' })

    expect(wrapper.findAll('.extra').wrappers.map((extra) => extra.text())).toEqual([
      'public',
      'closed',
      'hidden',
    ])
  })
})
