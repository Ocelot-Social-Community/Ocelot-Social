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
      propsData: {
        roles: ROLES,
        activeName: 'user',
        // Both required now: each used to have a default that two of the three pages kept and
        // the third overrode, which is how the same five roles ended up called "Mitglied" on
        // one screen and `usual` on the other, with five locks here and one there.
        labelFor: (role) => role.name,
        badgeFor: (role) => Boolean(role.protected),
        ...propsData,
      },
      slots,
    })

  it('marks the active role', () => {
    const wrapper = Wrapper()

    expect(wrapper.find('[data-test="role-tab-user"]').classes()).toContain(
      'os-toggle-group__option--selected',
    )
    expect(wrapper.find('[data-test="role-tab-owner"]').classes()).not.toContain(
      'os-toggle-group__option--selected',
    )
  })

  it('reports selection and hover, and clears the hover on leave', async () => {
    const wrapper = Wrapper()

    await wrapper.find('[data-test="role-tab-owner"]').trigger('click')
    await wrapper.find('[data-test="role-tab-owner"]').trigger('mouseenter')
    await wrapper.find('[data-test="role-tab-owner"]').trigger('mouseleave')

    expect(wrapper.emitted('select')).toEqual([['owner']])
    expect(wrapper.emitted('hover')).toEqual([['owner'], [null]])
  })

  it('leaves the lock rule to the page, because the two role models differ', () => {
    // Group roles are fixed by `system`, network roles only have `protected`. The component
    // must not pick one of them behind the caller's back.
    const bySystem = Wrapper({
      roles: [
        { name: 'usual', system: true, protected: false },
        { name: 'steward', system: false, protected: false },
      ],
      badgeFor: (role) => role.system,
    })

    expect(bySystem.find('[data-test="role-tab-usual"] .role-tab__badge').exists()).toBe(true)
    expect(bySystem.find('[data-test="role-tab-steward"] .role-tab__badge').exists()).toBe(false)
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

  it('names the row for assistive tech', () => {
    const wrapper = Wrapper({ label: 'Roles' })

    expect(wrapper.find('[role="radiogroup"]').attributes('aria-label')).toBe('Roles')
  })

  it('renders whatever the page adds at the end of the row', () => {
    const wrapper = Wrapper({}, { extra: '<button data-test="add">+</button>' })

    expect(wrapper.find('[data-test="add"]').exists()).toBe(true)
  })
})

describe('the highlight', () => {
  const Wrapper = (propsData = {}) =>
    mount(RoleTabs, {
      localVue,
      propsData: {
        roles: ROLES,
        activeName: 'user',
        labelFor: (role) => role.name,
        badgeFor: (role) => Boolean(role.protected),
        ...propsData,
      },
    })

  it('marks the roles something elsewhere on the page points at', () => {
    const wrapper = Wrapper({ highlightFor: (role) => role.name === 'owner' })

    expect(wrapper.find('[data-test="role-tab-owner"]').classes()).toContain(
      'os-toggle-group__option--highlighted',
    )
    expect(wrapper.find('[data-test="role-tab-user"]').classes()).not.toContain(
      'os-toggle-group__option--highlighted',
    )
  })

  it('marks nothing by default, so a page that says nothing marks nothing', () => {
    const wrapper = Wrapper()

    expect(wrapper.findAll('.os-toggle-group__option--highlighted')).toHaveLength(0)
  })

  it('says which roles hold an unsaved edit, in words as well', () => {
    // The draft outlives a tab click, so the edit on a role one moved away from is still there
    // — and the tab is the only place left to see that.
    const wrapper = Wrapper({ draftedFor: (role) => role.name === 'user', draftedTitle: 'Unsaved' })

    const dot = wrapper.find('[data-test="role-tab-drafted-user"]')
    expect(dot.attributes('aria-label')).toBe('Unsaved')
    expect(wrapper.find('[data-test="role-tab-drafted-owner"]').exists()).toBe(false)
  })
})
