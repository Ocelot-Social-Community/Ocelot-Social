import { shallowMount } from '@vue/test-utils'
import Page from './index.vue'
import UserList from '~/components/_new/features/Admin/UserList/UserList.vue'

const localVue = global.localVue

describe('admin/users/index.vue', () => {
  it('renders the shared UserList pointing at the admin badge route', () => {
    const wrapper = shallowMount(Page, { localVue })
    const list = wrapper.findComponent(UserList)
    expect(list.exists()).toBe(true)
    expect(list.props('badgeRouteName')).toBe('admin-users-id')
  })
})
