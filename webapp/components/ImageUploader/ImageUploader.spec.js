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
      const message = 'File upload failed'
      const fileError = { status: 'error' }
      const unSupportedFileMessage =
        'Please upload an image of file format : jpg , jpeg , png or gif'

      it('shows an error toaster when verror is called', () => {
        wrapper.vm.onDropzoneError(fileError, message)
        expect(mocks.$toast.error).toHaveBeenCalledWith(fileError.status, message)
      })

      it('shows an error toaster when unSupported file is uploaded', () => {
        wrapper.vm.onUnSupportedFormat(fileError.status, unSupportedFileMessage)
        expect(mocks.$toast.error).toHaveBeenCalledWith(fileError.status, unSupportedFileMessage)
      })
    })
  })
})
