import { shallowMount } from '@vue/test-utils'
import Modal from './Modal.vue'
import ConfirmModal from './ConfirmModal.vue'
import DisableModal from './DisableModal.vue'
import ReportModal from './ReportModal.vue'
import Vuex from 'vuex'
import { getters, mutations } from '../../store/modal'
import Vue from 'vue'

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
      expect(wrapper.contains(ConfirmModal)).toBe(false)
      expect(wrapper.contains(DisableModal)).toBe(false)
      expect(wrapper.contains(ReportModal)).toBe(false)
    })

    describe('store/modal holds data to disable', () => {
      beforeEach(() => {
        state = {
          open: 'disable',
          data: {
            type: 'contribution',
            resource: {
              id: 'c456',
              title: 'some title',
            },
          },
        }
        wrapper = Wrapper()
      })

      it('renders disable modal', () => {
        expect(wrapper.contains(DisableModal)).toBe(true)
      })

      it('passes data to disable modal', () => {
        expect(wrapper.find(DisableModal).props()).toEqual({
          type: 'contribution',
          name: 'some title',
          id: 'c456',
        })
      })

      describe('child component emits close', () => {
        it('turns empty', async () => {
          wrapper.find(DisableModal).vm.$emit('close')
          await Vue.nextTick()
          expect(wrapper.contains(DisableModal)).toBe(false)
        })
      })

      describe('store/modal data contains a comment', () => {
        it('passes author name to disable modal', () => {
          state.data = {
            type: 'comment',
            resource: {
              id: 'c456',
              author: {
                name: 'Author name',
              },
            },
          }
          wrapper = Wrapper()
          expect(wrapper.find(DisableModal).props()).toEqual({
            type: 'comment',
            name: 'Author name',
            id: 'c456',
          })
        })

        it('does not crash if author is undefined', () => {
          state.data = {
            type: 'comment',
            resource: {
              id: 'c456',
            },
          }
          wrapper = Wrapper()
          expect(wrapper.find(DisableModal).props()).toEqual({
            type: 'comment',
            name: '',
            id: 'c456',
          })
        })
      })

      describe('store/modal data contains an user', () => {
        it('passes user name to report modal', () => {
          state.data = {
            type: 'user',
            resource: {
              id: 'u456',
              name: 'Username',
            },
          }
          wrapper = Wrapper()
          expect(wrapper.find(DisableModal).props()).toEqual({
            type: 'user',
            name: 'Username',
            id: 'u456',
          })
        })
      })

      describe('store/modal data contains no valid datatype', () => {
        it('passes something  as datatype to modal', () => {
          state.data = {
            type: 'something',
            resource: {
              id: 's456',
              name: 'Username',
            },
          }
          wrapper = Wrapper()
          expect(wrapper.find(DisableModal).props()).toEqual({
            type: 'something',
            name: null,
            id: 's456',
          })
        })
      })
    })
  })
})
