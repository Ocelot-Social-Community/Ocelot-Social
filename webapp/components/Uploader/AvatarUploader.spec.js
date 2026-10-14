import { shallowMount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vue from 'vue'
import AvatarUploader from './AvatarUploader'

const localVue = global.localVue

describe('AvatarUploader', () => {
  let wrapper

  const mocks = {
    $apollo: {},
    $toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
    $t: jest.fn(),
  }

  const propsData = {
    profile: {
      avatar: { url: '/api/generic.jpg' },
    },
    updateMutation: jest.fn(),
  }

  const result = { UpdateUser: { id: 'upload1', avatar: { url: '/upload/avatar.jpg' } } }

  beforeEach(() => {
    jest.useFakeTimers()
    mocks.$apollo.mutate = jest.fn().mockResolvedValue({ data: result })
    wrapper = shallowMount(AvatarUploader, { localVue, propsData, mocks })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sends the UpdateUser mutation when vddrop is called', () => {
    wrapper.vm.vddrop([{ filename: 'avatar.jpg' }])
    expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
  })

  it('hands the mutation result on once the upload succeeded', async () => {
    await wrapper.vm.vddrop([{ filename: 'avatar.jpg' }])
    await flushPromises()
    expect(wrapper.emitted('uploaded')).toEqual([[result]])
  })

  describe('error handling', () => {
    const message = 'File upload failed'
    const fileError = { status: 'error' }

    it('defaults to error false', () => {
      expect(wrapper.vm.error).toEqual(false)
    })

    it('shows an error toaster when verror is called', () => {
      wrapper.vm.verror(fileError, message)
      expect(mocks.$toast.error).toHaveBeenCalledWith(fileError.status, message)
    })

    it('changes error status from false to true to false', async () => {
      wrapper.vm.verror(fileError, message)
      await Vue.nextTick()
      expect(wrapper.vm.error).toEqual(true)
      jest.runAllTimers()
      expect(wrapper.vm.error).toEqual(false)
    })

    it('shows an error toaster when the apollo mutation rejects', async () => {
      mocks.$apollo.mutate.mockRejectedValue({
        message: 'File upload unsuccessful! Whatcha gonna do?',
      })
      await wrapper.vm.vddrop([{ filename: 'avatar.jpg' }])
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('uploaded')).toBeUndefined()
    })
  })
})
