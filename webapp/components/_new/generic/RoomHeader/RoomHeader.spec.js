import { mount } from '@vue/test-utils'
import RoomHeader from './RoomHeader.vue'

const localVue = global.localVue

const stubs = {
  AvatarImage: { props: ['profile', 'size'], template: '<i class="stub-avatar" />' },
  RoomTitleLink: {
    props: ['name', 'to', 'showGroupIcon', 'ariaLabel'],
    template: '<span class="stub-title" @click="$emit(\'click\', $event)">{{ name }}</span>',
  },
}

describe('RoomHeader', () => {
  const profile = { id: 'g1', name: 'Yoga', avatar: null }
  const Wrapper = (propsData = {}, slots = {}) =>
    mount(RoomHeader, {
      localVue,
      stubs,
      propsData: { profile, title: 'Yoga', ...propsData },
      slots,
    })

  it('shows whose room it is: avatar and name', () => {
    const wrapper = Wrapper()
    expect(wrapper.findComponent(stubs.AvatarImage).props()).toEqual({ profile, size: 'small' })
    expect(wrapper.find('.stub-title').text()).toBe('Yoga')
  })

  it('hands link and group icon on to the title', () => {
    const to = { name: 'groups-id-slug', params: { id: 'g1', slug: 'yoga' } }
    const wrapper = Wrapper({ to, showGroupIcon: true })
    expect(wrapper.findComponent(stubs.RoomTitleLink).props()).toEqual({
      name: 'Yoga',
      to,
      showGroupIcon: true,
      ariaLabel: null,
    })
  })

  it('hands on what the link announces, and says when the title is clicked', async () => {
    const wrapper = Wrapper({ ariaLabel: 'Go to the group Yoga' })
    expect(wrapper.findComponent(stubs.RoomTitleLink).props('ariaLabel')).toBe(
      'Go to the group Yoga',
    )
    await wrapper.find('.stub-title').trigger('click')
    expect(wrapper.emitted('title-click')).toHaveLength(1)
  })

  it('puts the buttons it is given at its end', () => {
    const wrapper = Wrapper({}, { default: '<button class="given">x</button>' })
    expect(wrapper.find('.room-header__actions .given').exists()).toBe(true)
  })

  it('has no place for buttons when there are none', () => {
    expect(Wrapper().find('.room-header__actions').exists()).toBe(false)
  })

  it('is of the usual height unless asked to be compact', () => {
    expect(Wrapper().classes()).not.toContain('room-header--compact')
    expect(Wrapper({ compact: true }).classes()).toContain('room-header--compact')
  })
})
