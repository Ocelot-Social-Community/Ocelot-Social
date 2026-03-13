import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import ReportList from './ReportList'
import { reports } from './ReportList.story'
import ReportsTable from '~/components/features/ReportsTable/ReportsTable'
import DropdownFilter from '~/components/DropdownFilter/DropdownFilter'

const localVue = global.localVue

const stubs = {
  'client-only': true,
  'nuxt-link': true,
  'confirm-modal': { template: '<div class="confirm-modal-stub" />' },
}

describe('ReportList', () => {
  let mocks, getters, wrapper

  beforeEach(() => {
    mocks = {
      $apollo: {
        mutate: jest
          .fn()
          .mockResolvedValueOnce({
            data: { review: { disable: true, resourceId: 'some-resource', closed: true } },
          })
          .mockRejectedValue({ message: 'Unable to review' }),
      },
      $t: jest.fn(),
      $toast: {
        error: jest.fn((message) => message),
      },
    }
    getters = {
      'auth/user': () => {
        return { slug: 'awesome-user' }
      },
      'auth/isModerator': () => true,
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters,
      })
      return mount(ReportList, { mocks, localVue, store, stubs })
    }

    describe('renders children components', () => {
      beforeEach(async () => {
        wrapper = Wrapper()
      })

      it('renders DropdownFilter', () => {
        expect(wrapper.findComponent(DropdownFilter).exists()).toBe(true)
      })

      it('renders ReportsTable', () => {
        expect(wrapper.findComponent(ReportsTable).exists()).toBe(true)
      })
    })

    describe('confirm is emitted by reports table', () => {
      beforeEach(async () => {
        wrapper = Wrapper()
        wrapper.setData({ reports })
        wrapper.findComponent(ReportsTable).vm.$emit('confirm', reports[0])
      })

      it('shows ConfirmModal', () => {
        expect(wrapper.find('.confirm-modal-stub').exists()).toBe(true)
      })
    })
  })
})
