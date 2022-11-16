import { mount } from '@vue/test-utils'
import ImageUploader from './ImageUploader.vue'

const localVue = global.localVue

describe('ImageUploader.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $toast: {
        error: jest.fn(),
      },
      $t: jest.fn((string) => string),
    }
  })
  describe('mount', () => {
    const Wrapper = () => {
      return mount(ImageUploader, { mocks, localVue })
    }
    beforeEach(() => {
      wrapper = Wrapper()
    })

    describe('handles errors', () => {
      beforeEach(() => jest.useFakeTimers())
      const unSupportedFileMessage = 'message'

      it('shows an error toaster when unSupported file is uploaded', () => {
        wrapper.vm.onUnSupportedFormat(unSupportedFileMessage)
        expect(mocks.$toast.error).toHaveBeenCalledWith(unSupportedFileMessage)
      })
    })
  })
})
