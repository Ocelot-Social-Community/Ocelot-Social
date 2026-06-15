import { mount } from '@vue/test-utils'
import CommentForm from './CommentForm'
import Vue from 'vue'
import MutationObserver from 'mutation-observer'

global.MutationObserver = MutationObserver

const localVue = global.localVue

describe('CommentForm.vue', () => {
  let mocks
  let wrapper
  let propsData
  let cancelMethodSpy
  let closeMethodSpy

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $i18n: {
        locale: () => 'en',
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
      $filters: {
        removeHtml: (a) => a,
      },
    }
  })

  describe('mount', () => {
    describe('create comment', () => {
      beforeEach(() => {
        mocks = {
          ...mocks,
          $apollo: {
            mutate: jest
              .fn()
              .mockResolvedValueOnce({
                data: {
                  CreateComment: {
                    contentExcerpt: 'this is a comment',
                  },
                },
              })
              .mockRejectedValue({
                message: 'Ouch!',
              }),
          },
        }
        propsData = {
          post: {
            id: 'p001',
          },
        }
        const Wrapper = () => {
          return mount(CommentForm, {
            mocks,
            localVue,
            propsData,
          })
        }
        wrapper = Wrapper()
        cancelMethodSpy = jest.spyOn(wrapper.vm, 'clear')
      })

      it('calls the apollo mutation when form is submitted', async () => {
        wrapper.vm.updateEditorContent('this is a comment')
        await wrapper.find('form').trigger('submit')
        expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
      })

      it('calls `clear` method when the cancel button is clicked', async () => {
        wrapper.vm.updateEditorContent('ok')
        await Vue.nextTick()
        await wrapper.find('[data-test="cancel-button"]').trigger('submit')
        expect(cancelMethodSpy).toHaveBeenCalledTimes(1)
      })

      describe('mutation resolves', () => {
        beforeEach(async () => {
          wrapper.vm.updateEditorContent('this is a comment')
          wrapper.find('form').trigger('submit')
        })

        it('shows a success toaster', async () => {
          await mocks.$apollo.mutate
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })

        it('clears the editor', () => {
          expect(cancelMethodSpy).toHaveBeenCalledTimes(1)
        })

        describe('mutation fails', () => {
          it('shows the error toaster', async () => {
            await wrapper.find('form').trigger('submit')
            await mocks.$apollo.mutate
            expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
          })
        })
      })
    })

    describe('create comment without comment.create permission', () => {
      let mutateSpy
      let deniedWrapper
      beforeEach(() => {
        mutateSpy = jest.fn()
        deniedWrapper = mount(CommentForm, {
          mocks: { ...mocks, $can: () => false, $apollo: { mutate: mutateSpy } },
          localVue,
          propsData: { post: { id: 'p001' } },
        })
      })

      it('does not mutate and shows a denied-hint toast instead of a silent no-op', async () => {
        deniedWrapper.vm.updateEditorContent('this is a comment')
        await deniedWrapper.find('form').trigger('submit')
        expect(mutateSpy).not.toHaveBeenCalled()
        expect(mocks.$toast.error).toHaveBeenCalled()
      })
    })

    describe('update comment', () => {
      beforeEach(() => {
        mocks = {
          ...mocks,
          $apollo: {
            mutate: jest
              .fn()
              .mockResolvedValueOnce({
                data: {
                  UpdateComment: {
                    contentExcerpt: 'this is a comment',
                  },
                },
              })
              .mockRejectedValue({
                message: 'Ouch!',
              }),
          },
        }
        propsData = {
          update: true,
          comment: {
            id: 'c001',
          },
        }
        const Wrapper = () => {
          return mount(CommentForm, {
            mocks,
            localVue,
            propsData,
          })
        }
        wrapper = Wrapper()
        closeMethodSpy = jest.spyOn(wrapper.vm, 'closeEditWindow')
      })

      describe('form submitted', () => {
        it('calls the apollo mutation', async () => {
          wrapper.vm.updateEditorContent('this is a comment')
          await wrapper.find('form').trigger('submit')
          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
        })

        it('calls `closeEditWindow` method', async () => {
          wrapper.vm.updateEditorContent('ok')
          await wrapper.find('form').trigger('submit')
          expect(closeMethodSpy).toHaveBeenCalledTimes(1)
        })

        it('emits `finishEditing` event', async () => {
          wrapper.vm.updateEditorContent('ok')
          await wrapper.find('form').trigger('submit')
          expect(wrapper.emitted('finishEditing')).toBeTruthy()
        })
      })

      describe('cancel button is clicked', () => {
        it('calls `closeEditWindow` method', async () => {
          wrapper.vm.updateEditorContent('ok')
          await wrapper.find('[data-test="cancel-button"]').trigger('submit')
          expect(closeMethodSpy).toHaveBeenCalledTimes(1)
        })

        it('emits `finishEditing` event', async () => {
          wrapper.vm.updateEditorContent('ok')
          await wrapper.find('[data-test="cancel-button"]').trigger('submit')
          expect(wrapper.emitted('finishEditing')).toBeTruthy()
        })
      })

      describe('mutation resolves', () => {
        beforeEach(async () => {
          wrapper.vm.updateEditorContent('this is a comment')
          wrapper.find('form').trigger('submit')
        })

        it('shows a success toaster', async () => {
          await mocks.$apollo.mutate
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })

        it('closes the editor', () => {
          expect(closeMethodSpy).toHaveBeenCalledTimes(1)
        })

        describe('mutation fails', () => {
          it('shows the error toaster', async () => {
            await wrapper.find('form').trigger('submit')
            await mocks.$apollo.mutate
            expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
          })
        })
      })
    })
  })
})
