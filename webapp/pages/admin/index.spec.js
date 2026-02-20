import { mount } from '@vue/test-utils'
import AdminIndexPage from './index.vue'

import VueApollo from 'vue-apollo'

const localVue = global.localVue

localVue.use(VueApollo)

describe('admin/index.vue', () => {
  let Wrapper
  let store
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    Wrapper = () => {
      return mount(AdminIndexPage, {
        store,
        mocks,
        localVue,
      })
    }

    describe('in loading state', () => {
      it('shows a loading spinner and no error message', async () => {
        const wrapper = Wrapper()
        wrapper.vm.$data.$apolloData.loading = 1
        await wrapper.vm.$nextTick()
        expect(wrapper.findComponent({ name: 'OsSpinner' }).exists()).toBe(true)
        expect(mocks.$t).not.toHaveBeenCalledWith('site.error-occurred')
      })
    })

    describe('in default state (no data, not loading)', () => {
      it('displays the error message', () => {
        Wrapper()
        expect(mocks.$t).toHaveBeenCalledWith('site.error-occurred')
      })
    })
  })
})
