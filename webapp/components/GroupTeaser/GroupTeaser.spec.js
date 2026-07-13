import { shallowMount } from '@vue/test-utils'
import GroupTeaser from './GroupTeaser.vue'

const localVue = global.localVue

const stubs = {
  dropdown: {
    template: '<div><slot :open-menu="() => {}" :close-menu="() => {}" /></div>',
  },
  'user-teaser-helper': true,
  'profile-avatar': true,
  'group-teaser-popover': true,
}

const fakeGroup = { id: 'g1', slug: 'test-group', name: 'Test Group' }

describe('GroupTeaser.vue', () => {
  const Wrapper = (props = {}) =>
    shallowMount(GroupTeaser, {
      propsData: { group: fakeGroup, ...props },
      localVue,
      stubs,
    })

  describe('prop defaults', () => {
    it('showPopover defaults to true', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.showPopover).toBe(true)
    })

    it('hoverDelay defaults to 500', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.hoverDelay).toBe(500)
    })
  })

  describe('prop values are applied', () => {
    it('accepts showPopover=false', () => {
      const wrapper = Wrapper({ showPopover: false })
      expect(wrapper.vm.showPopover).toBe(false)
    })

    it('accepts custom hoverDelay', () => {
      const wrapper = Wrapper({ hoverDelay: 800 })
      expect(wrapper.vm.hoverDelay).toBe(800)
    })
  })

  describe('groupLink', () => {
    it('returns route object when id and slug are present', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.groupLink).toEqual({
        name: 'groups-id-slug',
        params: { id: 'g1', slug: 'test-group' },
      })
    })

    it('returns null when group has no id', () => {
      const wrapper = Wrapper({ group: { slug: 'no-id', name: 'No ID' } })
      expect(wrapper.vm.groupLink).toBeNull()
    })

    it('returns null when group has no slug', () => {
      const wrapper = Wrapper({ group: { id: 'g1', name: 'No Slug' } })
      expect(wrapper.vm.groupLink).toBeNull()
    })
  })
})
