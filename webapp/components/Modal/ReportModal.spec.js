import { shallowMount, mount } from '@vue/test-utils'
import ReportModal from './ReportModal.vue'
import Vue from 'vue'

const localVue = global.localVue

const stubs = {
  'os-modal': {
    template: '<div><slot /><slot name="footer" /></div>',
  },
}

describe('ReportModal.vue', () => {
  let wrapper
  let propsData
  let mocks

  beforeEach(() => {
    propsData = {
      type: 'contribution',
      id: 'c43',
    }
    mocks = {
      $t: jest.fn((a) => a),
      $filters: {
        truncate: (a) => a,
      },
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $toastBackendError: jest.fn(),
      $apollo: {
        mutate: jest.fn().mockResolvedValue({
          data: {},
        }),
      },
    }
  })

  describe('shallowMount', () => {
    const Wrapper = () => {
      return shallowMount(ReportModal, {
        propsData,
        mocks,
        localVue,
        stubs,
      })
    }

    describe('defaults', () => {
      it('loading false', () => {
        expect(Wrapper().vm.loading).toBe(false)
      })
    })

    describe('given a user', () => {
      beforeEach(() => {
        propsData = {
          ...propsData,
          type: 'user',
          id: 'u4',
          name: 'Bob Ross',
        }
      })

      it('mentions user name', () => {
        Wrapper()
        const calls = mocks.$t.mock.calls
        const expected = [
          [
            'report.user.message',
            {
              name: 'Bob Ross',
            },
          ],
        ]
        expect(calls).toEqual(expect.arrayContaining(expected))
      })
    })

    describe('given a contribution', () => {
      beforeEach(() => {
        propsData = {
          ...propsData,
          type: 'contribution',
          id: 'p23',
          name: 'It is a post',
        }
      })

      it('mentions post title', () => {
        Wrapper()
        const calls = mocks.$t.mock.calls
        const expected = [
          [
            'report.contribution.message',
            {
              name: 'It is a post',
            },
          ],
        ]
        expect(calls).toEqual(expect.arrayContaining(expected))
      })
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(ReportModal, {
        propsData,
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders', () => {
      expect(Wrapper().element.tagName).toBe('DIV')
    })

    describe('given id', () => {
      beforeEach(() => {
        propsData = {
          ...propsData,
          type: 'user',
          id: 'u4711',
        }
        wrapper = Wrapper()
      })

      describe('click cancel button', () => {
        beforeEach(() => {
          wrapper = Wrapper()
          wrapper.find('button.cancel').trigger('click')
        })

        it('closes at once', () => {
          expect(wrapper.vm.isOpen).toBe(false)
          expect(wrapper.emitted().close).toHaveLength(1)
        })

        it('does not call mutation', () => {
          expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
        })
      })

      describe('click confirm button', () => {
        beforeEach(async () => {
          wrapper.find('.report-radio-option').trigger('click')
          await Vue.nextTick()
          wrapper.find('button.confirm').trigger('click')
          await Vue.nextTick()
        })

        it('calls report mutation', () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalled()
        })

        it('displays a success toast', () => {
          expect(mocks.$toast.success).toHaveBeenCalledWith('report.success')
        })

        it('closes at once', () => {
          expect(wrapper.vm.isOpen).toBe(false)
          expect(wrapper.emitted().close).toHaveLength(1)
          expect(wrapper.vm.loading).toBe(false)
        })
      })

      describe('confirm fails', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockRejectedValue(new Error('GraphQL error: User'))
          wrapper = Wrapper()
          wrapper.find('.report-radio-option').trigger('click')
          await Vue.nextTick()
          wrapper.find('button.confirm').trigger('click')
          await new Promise(process.nextTick)
        })

        it('shows the matching error toast', () => {
          expect(mocks.$toast.error).toHaveBeenCalledWith('report.user.error')
          expect(mocks.$toast.success).not.toHaveBeenCalled()
        })

        it('closes at once', () => {
          expect(wrapper.vm.isOpen).toBe(false)
          expect(wrapper.emitted().close).toHaveLength(1)
          expect(wrapper.vm.loading).toBe(false)
        })
      })
    })
  })
})
