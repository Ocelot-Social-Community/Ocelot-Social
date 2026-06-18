import { shallowMount } from '@vue/test-utils'
import Page from './_id.vue'
import UserBadges from '~/components/_new/features/Admin/UserBadges/UserBadges.vue'

const localVue = global.localVue

describe('moderation/users/_id.vue', () => {
  it('renders the shared UserBadges for the routed user id', () => {
    const wrapper = shallowMount(Page, {
      localVue,
      mocks: { $route: { params: { id: 'user-7' } } },
    })
    const badges = wrapper.findComponent(UserBadges)
    expect(badges.exists()).toBe(true)
    expect(badges.props('userId')).toBe('user-7')
  })

  it('is gated by the badge.manage middleware', () => {
    expect(Page.middleware).toContain('canManageBadges')
  })
})
