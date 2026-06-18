import { shallowMount } from '@vue/test-utils'
import Page from './reports.vue'
import ReportList from '~/components/features/ReportList/ReportList'

const localVue = global.localVue

describe('admin/reports.vue', () => {
  it('renders the shared ReportList', () => {
    const wrapper = shallowMount(Page, { localVue })
    expect(wrapper.findComponent(ReportList).exists()).toBe(true)
  })
})
