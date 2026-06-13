import { mount } from '@vue/test-utils'
import PermissionDisable from './PermissionDisable.vue'

const localVue = global.localVue

const Wrapper = (granted, permission = 'post.create') =>
  mount(PermissionDisable, {
    localVue,
    mocks: { $can: jest.fn((p) => p === 'post.create' && granted), $t: (k) => k },
    propsData: { permission },
    slots: { default: '<button class="inner">x</button>' },
  })

describe('PermissionDisable', () => {
  it('renders the slot normally when the permission is granted', () => {
    const wrapper = Wrapper(true)
    expect(wrapper.find('.inner').exists()).toBe(true)
    expect(wrapper.classes()).not.toContain('permission-disable--denied')
  })

  it('grays out (adds the denied class) when the permission is missing', () => {
    const wrapper = Wrapper(false)
    expect(wrapper.find('.inner').exists()).toBe(true)
    expect(wrapper.classes()).toContain('permission-disable--denied')
  })

  it('treats an empty permission as always granted (edit-mode forms)', () => {
    const wrapper = Wrapper(false, '')
    expect(wrapper.classes()).not.toContain('permission-disable--denied')
  })
})
