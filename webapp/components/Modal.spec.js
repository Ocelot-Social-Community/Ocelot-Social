import { shallowMount } from '@vue/test-utils'
import Modal from './Modal.vue'
import ConfirmModal from './Modal/ConfirmModal.vue'
import ReportModal from './Modal/ReportModal.vue'
import Vuex from 'vuex'
import { getters, mutations } from '../store/modal'

const localVue = global.localVue

describe('Modal.vue', () => {
  let wrapper
  let store
  let state
  let mocks

  const createWrapper = (mountMethod) => {
    return () => {
      store = new Vuex.Store({
        state,
        getters: {
          'modal/open': getters.open,
          'modal/data': getters.data,
        },
        mutations: {
          'modal/SET_OPEN': mutations.SET_OPEN,
        },
      })
      return mountMethod(Modal, {
        store,
        mocks,
        localVue,
      })
    }
  }

  beforeEach(() => {
    mocks = {
      $filters: {
        truncate: (a) => a,
      },
      $toast: {
        success: () => {},
        error: () => {},
      },
      $t: () => {},
    }
    state = {
      open: null,
      data: {},
    }
  })

  describe('shallowMount', () => {
    const Wrapper = createWrapper(shallowMount)

    it('initially empty', () => {
      wrapper = Wrapper()
      expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false)
      expect(wrapper.findComponent(ReportModal).exists()).toBe(false)
    })
  })
})
