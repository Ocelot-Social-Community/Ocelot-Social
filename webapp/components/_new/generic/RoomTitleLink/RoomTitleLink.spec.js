import { mount, createLocalVue } from '@vue/test-utils'
import RoomTitleLink from './RoomTitleLink.vue'

const localVue = createLocalVue()

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a class="stub-nuxt-link" @click="$emit(\'click\', $event)"><slot /></a>',
}

const OsIconStub = {
  name: 'OsIcon',
  props: ['icon'],
  template: '<i class="stub-icon" />',
}

const factory = (propsData = {}) =>
  mount(RoomTitleLink, {
    propsData,
    localVue,
    stubs: {
      'nuxt-link': NuxtLinkStub,
      OsIcon: OsIconStub,
    },
  })

describe('RoomTitleLink', () => {
  describe('without `to`', () => {
    it('renders a span fallback with the name', () => {
      const wrapper = factory({ name: 'General' })
      expect(wrapper.element.tagName).toBe('SPAN')
      expect(wrapper.text()).toContain('General')
    })

    it('does not render the group icon by default', () => {
      const wrapper = factory({ name: 'General' })
      expect(wrapper.find('.stub-icon').exists()).toBe(false)
    })

    it('renders the group icon when showGroupIcon is true', () => {
      const wrapper = factory({ name: 'General', showGroupIcon: true })
      expect(wrapper.find('.stub-icon').exists()).toBe(true)
    })

    it('emits click events from the span', async () => {
      const wrapper = factory({ name: 'General' })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('forwards ariaLabel', () => {
      const wrapper = factory({ name: 'General', ariaLabel: 'Go to general' })
      expect(wrapper.attributes('aria-label')).toBe('Go to general')
    })
  })

  describe('with `to`', () => {
    it('renders a nuxt-link when `to` is given', () => {
      const wrapper = factory({ name: 'General', to: { name: 'groups-id-slug' } })
      expect(wrapper.find('.stub-nuxt-link').exists()).toBe(true)
      expect(wrapper.find('.stub-nuxt-link').text()).toContain('General')
    })

    it('emits click from the nuxt-link branch', async () => {
      const wrapper = factory({ name: 'General', to: { name: 'groups-id-slug' } })
      await wrapper.find('.stub-nuxt-link').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('renders the group icon when requested', () => {
      const wrapper = factory({
        name: 'General',
        to: { name: 'groups-id-slug' },
        showGroupIcon: true,
      })
      expect(wrapper.find('.stub-icon').exists()).toBe(true)
    })
  })
})
