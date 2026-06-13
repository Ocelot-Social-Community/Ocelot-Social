import { mount } from '@vue/test-utils'
import PermissionGate from './PermissionGate.vue'

const localVue = global.localVue

const Wrapper = (granted) =>
  mount(PermissionGate, {
    localVue,
    mocks: { $can: jest.fn((permission) => permission === 'post.create' && granted) },
    propsData: { permission: 'post.create' },
    slots: { default: '<button class="gated">create</button>' },
  })

describe('PermissionGate', () => {
  it('renders the slot when the permission is granted', () => {
    const wrapper = Wrapper(true)
    expect(wrapper.find('.gated').exists()).toBe(true)
  })

  it('renders nothing when the permission is denied', () => {
    const wrapper = Wrapper(false)
    expect(wrapper.find('.gated').exists()).toBe(false)
  })
})
