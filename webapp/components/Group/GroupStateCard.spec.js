import { mount } from '@vue/test-utils'

import GroupStateCard from './GroupStateCard.vue'
import { iconRegistry } from '~/utils/iconRegistry'

const localVue = global.localVue

describe('GroupStateCard', () => {
  const Wrapper = (options = {}) =>
    mount(GroupStateCard, {
      localVue,
      propsData: { icon: iconRegistry.globe, ...options.propsData },
      attrs: options.attrs,
      listeners: options.listeners,
      slots: options.slots ?? { title: 'Public', default: 'Visible to everybody' },
    })

  it('states: a div with the glyph, the name and what it means', () => {
    const wrapper = Wrapper()

    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.find('.group-state-card__title').text()).toBe('Public')
    expect(wrapper.find('.group-state-card__description').text()).toBe('Visible to everybody')
    expect(wrapper.find('.group-state-card__caption').exists()).toBe(false)
  })

  it('leaves the description out when it is given none', () => {
    const wrapper = Wrapper({ slots: { title: 'Public' } })

    expect(wrapper.find('.group-state-card__description').exists()).toBe(false)
  })

  it('carries a caption above the name when it is given one', () => {
    const wrapper = Wrapper({ slots: { title: 'Public', caption: 'The group is:' } })

    expect(wrapper.find('.group-state-card__caption').text()).toBe('The group is:')
  })

  it('is picked as a button, with whatever the caller binds landing on it', async () => {
    const click = jest.fn()
    const wrapper = Wrapper({
      propsData: { tag: 'button', active: true },
      attrs: { type: 'button', 'data-test': 'card' },
      listeners: { click },
    })

    await wrapper.trigger('click')

    expect(wrapper.element.tagName).toBe('BUTTON')
    // The picked one says so to assistive tech too, not only with its border.
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.attributes('data-test')).toBe('card')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['group-state-card--interactive', 'group-state-card--active']),
    )
    expect(click).toHaveBeenCalled()
  })
})
