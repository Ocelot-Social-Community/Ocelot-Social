import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import MySocialMedia from './my-social-media.vue'
import Vuex from 'vuex'
import Vue from 'vue'

const localVue = global.localVue

describe('my-social-media.vue', () => {
  let wrapper
  let mocks
  let getters
  let mutations
  const socialMediaUrl = 'https://freeradical.zone/@mattwr18'
  const newSocialMediaUrl = 'https://twitter.com/mattwr18'
  const faviconUrl = 'https://freeradical.zone/favicon.ico'

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
    getters = {
      'auth/user': () => {
        return {}
      },
    }
    mutations = {
      'modal/SET_OPEN': jest.fn().mockResolvedValueOnce(),
    }
  })

  describe('mount', () => {
    let form, input
    const Wrapper = () => {
      const store = new Vuex.Store({
        getters,
        mutations,
      })
      return mount(MySocialMedia, { store, mocks, localVue })
    }

    describe('adding social media link', () => {
      beforeEach(async () => {
        wrapper = Wrapper()
        form = wrapper.find('form')
        form.trigger('submit')
        await Vue.nextTick()
        input = wrapper.find('input#editSocialMedia')
      })

      it('requires the link to be a valid url', async () => {
        input.setValue('some value')
        form.trigger('submit')
        await Vue.nextTick()
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      it('displays an error message when not saved successfully', async () => {
        mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
        input.setValue(newSocialMediaUrl)
        form.trigger('submit')
        await Vue.nextTick()
        await flushPromises()
        expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
      })

      describe('success', () => {
        beforeEach(async () => {
          mocks.$apollo.mutate.mockResolvedValue({
            data: { CreateSocialMedia: { id: 's2', url: newSocialMediaUrl } },
          })
          input.setValue(newSocialMediaUrl)
          form.trigger('submit')
          await Vue.nextTick()
        })

        it('sends the new url to the backend', () => {
          const expected = expect.objectContaining({
            variables: { url: newSocialMediaUrl },
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('displays a success message', async () => {
          await flushPromises()
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })

        it('switches back to list', async () => {
          await flushPromises()
          const submitButton = wrapper.find('.base-button[data-test="add-save-button"]')
          expect(submitButton.text()).not.toContain('settings.social-media.submit')
        })
      })
    })

    describe('given existing social media links', () => {
      beforeEach(() => {
        getters = {
          'auth/user': () => ({
            socialMedia: [{ id: 's1', url: socialMediaUrl, favicon: faviconUrl }],
          }),
        }
        wrapper = Wrapper()
        form = wrapper.find('form')
      })

      describe('for each link it', () => {
        it('displays the favicon', () => {
          expect(wrapper.find(`img[src="${faviconUrl}"]`).exists()).toBe(true)
        })

        it('displays the url', () => {
          expect(wrapper.find(`a[href="${socialMediaUrl}"]`).exists()).toBe(true)
        })
      })

      it('does not accept a duplicate url', async () => {
        form.trigger('submit')
        await Vue.nextTick()
        wrapper.find('input#editSocialMedia').setValue(socialMediaUrl)
        form.trigger('submit')
        await Vue.nextTick()
        expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      })

      describe('editing social media link', () => {
        beforeEach(async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
          input = wrapper.find('input#editSocialMedia')
        })

        it('sends the new url to the backend', async () => {
          const expected = expect.objectContaining({
            variables: { id: 's1', url: newSocialMediaUrl },
          })
          input.setValue(newSocialMediaUrl)
          form.trigger('submit')
          await Vue.nextTick()
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })
      })

      // TODO: confirm deletion modal is not present
      describe.skip('deleting social media link', () => {
        beforeEach(async () => {
          const deleteButton = wrapper.find('.base-button[data-test="delete-button"]')
          deleteButton.trigger('click')
          await Vue.nextTick()
          // wrapper.find('button.cancel').trigger('click')
          // await Vue.nextTick()
        })

        it('sends the link id to the backend', () => {
          const expected = expect.objectContaining({
            variables: { id: 's1' },
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('displays a success message', async () => {
          await flushPromises()
          expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
})
