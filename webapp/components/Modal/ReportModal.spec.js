import { shallowMount, mount } from '@vue/test-utils'
import ReportModal from './ReportModal.vue'
import Vue from 'vue'

const localVue = global.localVue

const stubs = {
  'sweetalert-icon': true,
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
        success: () => {},
        error: () => {},
      },
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
      it('success false', () => {
        expect(Wrapper().vm.success).toBe(false)
      })

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

    describe('given a post', () => {
      beforeEach(() => {
        propsData = {
          ...propsData,
          type: 'post',
          id: 'p23',
          name: 'It is a post',
        }
      })

      it('mentions post title', () => {
        Wrapper()
        const calls = mocks.$t.mock.calls
        const expected = [
          [
            'report.post.message',
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

    beforeEach(() => {
      jest.useFakeTimers()
    })

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

        describe('after timeout', () => {
          beforeEach(jest.runAllTimers)

          it('fades away', () => {
            expect(wrapper.vm.isOpen).toBe(false)
          })

          it('emits "close"', () => {
            expect(wrapper.emitted().close).toBeTruthy()
          })

          it('does not call mutation', () => {
            expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
          })
        })
      })

      describe('click confirm button', () => {
        beforeEach(async () => {
          wrapper.find('.ds-radio-option-label').trigger('click')
          await Vue.nextTick()
          wrapper.find('button.confirm').trigger('click')
          await Vue.nextTick()
        })

        it('calls report mutation', () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalled()
        })

        it('sets success', () => {
          expect(wrapper.vm.success).toBe(true)
        })

        it('displays a success message', () => {
          const calls = mocks.$t.mock.calls
          const expected = [['report.success']]
          expect(calls).toEqual(expect.arrayContaining(expected))
        })

        describe('after timeout', () => {
          beforeEach(jest.runAllTimers)

          it('fades away', () => {
            expect(wrapper.vm.isOpen).toBe(false)
          })

          it('emits close', () => {
            expect(wrapper.emitted().close).toBeTruthy()
          })

          it('resets success', () => {
            expect(wrapper.vm.success).toBe(false)
          })
        })
      })
    })
  })
})
