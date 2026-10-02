import { mount } from '@vue/test-utils'

import RoleTabs from './RoleTabs.vue'

const localVue = global.localVue

const ROLES = [
  { name: 'user', protected: false },
  { name: 'owner', protected: true, label: 'Owner' },
]

describe('RoleTabs', () => {
  const Wrapper = (propsData = {}, slots = {}) =>
    mount(RoleTabs, {
      localVue,
      propsData: { roles: ROLES, activeName: 'user', ...propsData },
      slots,
    })

  it('marks the active role', () => {
    const wrapper = Wrapper()

    expect(wrapper.find('[data-test="role-tab-user"]').classes()).toContain('role-tab--active')
    expect(wrapper.find('[data-test="role-tab-owner"]').classes()).not.toContain('role-tab--active')
  })

  it('reports selection and hover, and clears the hover on leave', async () => {
    const wrapper = Wrapper()

    await wrapper.find('[data-test="role-tab-owner"]').trigger('click')
    await wrapper.find('[data-test="role-tab-owner"]').trigger('mouseenter')
    await wrapper.find('[data-test="role-tab-owner"]').trigger('mouseleave')

    expect(wrapper.emitted('select')).toEqual([['owner']])
    expect(wrapper.emitted('hover')).toEqual([['owner'], [null]])
  })

  it('names a role the way the page wants and badges the ones it marks', () => {
    const wrapper = Wrapper({
      labelFor: (role) => role.label || role.name,
      badgeFor: (role) => role.protected,
      badgeTitle: 'Protected',
    })

    expect(wrapper.find('[data-test="role-tab-owner"]').text()).toContain('Owner')
    const badge = wrapper.find('[data-test="role-tab-owner"] .role-tab__badge')

    expect(badge.exists()).toBe(true)
    // The reason the role is marked has to be READABLE, not only hoverable: this was a `★` with
    // a `title`, which a screen reader does not announce and which said nothing about why.
    expect(badge.attributes('aria-label')).toBe('Protected')
    expect(badge.attributes('role')).toBe('img')
    expect(wrapper.find('[data-test="role-tab-user"] .role-tab__badge').exists()).toBe(false)
  })

  it('renders whatever the page adds at the end of the row', () => {
    const wrapper = Wrapper({}, { extra: '<button data-test="add">+</button>' })

    expect(wrapper.find('[data-test="add"]').exists()).toBe(true)
  })
})
