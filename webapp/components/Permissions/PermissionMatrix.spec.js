import { mount } from '@vue/test-utils'

import PermissionMatrix from './PermissionMatrix.vue'

const localVue = global.localVue

const PERMISSIONS = [
  { key: 'post.create', group: 'content', description: 'Create posts.' },
  { key: 'comment.create', group: 'content', description: 'Comment on posts.' },
  { key: 'badge.manage', group: 'moderation', description: 'Grant badges.', available: false },
]

describe('PermissionMatrix', () => {
  const Wrapper = (propsData = {}) =>
    mount(PermissionMatrix, {
      localVue,
      propsData: { permissions: PERMISSIONS, granted: ['post.create'], ...propsData },
    })

  it('groups the catalog by its own group field, in declaration order', () => {
    const wrapper = Wrapper()

    expect(wrapper.findAll('.perm-group__title').wrappers.map((t) => t.text())).toEqual([
      'content',
      'moderation',
    ])
  })

  it('ticks what the role holds and nothing else', () => {
    const wrapper = Wrapper()

    expect(wrapper.find('[data-test="perm-post.create"]').element.checked).toBe(true)
    expect(wrapper.find('[data-test="perm-comment.create"]').element.checked).toBe(false)
  })

  it('reports a toggle with the key and the new state', async () => {
    const wrapper = Wrapper()

    const checkbox = wrapper.find('[data-test="perm-comment.create"]')
    checkbox.element.checked = true
    await checkbox.trigger('change')

    expect(wrapper.emitted('toggle')).toEqual([['comment.create', true]])
  })

  it('marks the difference a caller hands it', () => {
    const wrapper = Wrapper({ diff: { 'post.create': 'removed', 'comment.create': 'added' } })

    const classesOf = (key) =>
      wrapper.find(`[data-test="perm-${key}"]`).element.closest('label').className

    expect(classesOf('post.create')).toContain('perm-row--removed')
    expect(classesOf('comment.create')).toContain('perm-row--added')
  })

  it('disables a row the caller refuses, with its reason and its note', () => {
    // The gate case: granting an unavailable right has no effect, so the row says so rather
    // than letting somebody tick something inert.
    const wrapper = Wrapper({
      disabledFor: (permission) => permission.available === false,
      hintFor: (permission) => (permission.available === false ? 'Not configured' : null),
      noteFor: (permission) => (permission.available === false ? 'Not configured' : null),
    })

    const row = wrapper.find('[data-test="perm-badge.manage"]')

    expect(row.attributes('disabled')).toBeDefined()
    expect(row.element.closest('label').getAttribute('title')).toBe('Not configured')
    expect(wrapper.find('.perm-row__note').text()).toContain('Not configured')
  })

  it('takes the page`s wording for groups and descriptions', () => {
    const wrapper = Wrapper({
      groupLabel: (name) => `GROUP:${name}`,
      descriptionFor: (permission) => `DESC:${permission.key}`,
      testPrefix: 'role-user-perm-',
    })

    expect(wrapper.find('.perm-group__title').text()).toBe('GROUP:content')
    expect(wrapper.find('.perm-row__desc').text()).toBe('DESC:post.create')
    expect(wrapper.find('[data-test="role-user-perm-post.create"]').exists()).toBe(true)
  })
})
