import { mount } from '@vue/test-utils'
// Wolle import flushPromises from 'flush-promises'
import MySomethingList from './MySomethingList.vue'
// Wolle import Vuex from 'vuex'
import Vue from 'vue'

const localVue = global.localVue

describe('MySomethingList.vue', () => {
  let wrapper
  let propsData
  let data
  let mocks
  // let getters
  // Wolle const socialMediaUrl = 'https://freeradical.zone/@mattwr18'
  // const newSocialMediaUrl = 'https://twitter.com/mattwr18'

  beforeEach(() => {
    propsData = {
      useItems: [{ id: 'id', dummy: 'dummy' }],
      namePropertyKey: 'dummy',
      callbacks: { edit: jest.fn(), submit: jest.fn(), delete: jest.fn() },
    }
    data = () => {
      return {}
    }
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
    // getters = {
    //   'auth/user': () => {
    //     return {}
    //   },
    // }
  })

  describe('mount', () => {
    // Wolle let form, input, slots, submitButton
    let form, slots
    const Wrapper = () => {
      // const store = new Vuex.Store({
      //   getters,
      // })
      slots = {
        'list-item': '<div class="list-item"></div>',
        'edit-item': '<div class="edit-item"></div>',
      }
      return mount(MySomethingList, {
        propsData,
        data,
        // store,
        mocks,
        localVue,
        slots,
      })
    }

    // describe('adding social media link', () => {
    //   beforeEach(async () => {
    //     wrapper = Wrapper()
    //     form = wrapper.find('form')
    //     form.trigger('submit')
    //     await Vue.nextTick()
    //     console.log(wrapper.html())
    //     console.log('wrapper.vm.socialMediaLinks: ', wrapper.vm.socialMediaLinks)
    //     input = wrapper.find('input#editSocialMedia')
    //     console.log('input: ', input)
    //     submitButton = wrapper.find('button')
    //   })

    // Wolle it('requires the link to be a valid url', async () => {
    //   input.setValue('some value')
    //   form.trigger('submit')
    //   await Vue.nextTick()
    //   expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    // })

    // Wolle it('displays an error message when not saved successfully', async () => {
    //   mocks.$apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
    //   input.setValue(newSocialMediaUrl)
    //   form.trigger('submit')
    //   await Vue.nextTick()
    //   await flushPromises()
    //   expect(mocks.$toast.error).toHaveBeenCalledTimes(1)
    // })

    //   describe('success', () => {
    //     beforeEach(async () => {
    //       mocks.$apollo.mutate.mockResolvedValue({
    //         data: { CreateSocialMedia: { id: 's2', url: newSocialMediaUrl } },
    //       })
    //       input.setValue(newSocialMediaUrl)
    //       form.trigger('submit')
    //       await Vue.nextTick()
    //     })

    //     it('sends the new url to the backend', () => {
    //       const expected = expect.objectContaining({
    //         variables: { url: newSocialMediaUrl },
    //       })

    //       expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
    //     })

    //     it('displays a success message', async () => {
    //       await flushPromises()
    //       expect(mocks.$toast.success).toHaveBeenCalledTimes(1)
    //     })

    //     it('clears the form', async () => {
    //       await flushPromises()
    //       expect(input.value).toBe(undefined)
    //       expect(submitButton.vm.$attrs.disabled).toBe(true)
    //     })
    //   })
    // })

    describe('given existing social media links', () => {
      beforeEach(() => {
        // getters = {
        //   'auth/user': () => ({
        //     socialMedia: [{ id: 's1', url: socialMediaUrl }],
        //   }),
        // }
        // Wolle propsData = { editingLink: { id: 's1', url: socialMediaUrl } }
        // data = () => {
        //   return {
        //     editingLink: { id: 's2', url: socialMediaUrl },
        //   }
        // }
        wrapper = Wrapper()
        // form = wrapper.find('form')
      })

      describe('for each item it', () => {
        it('displays the item as slot "list-item"', () => {
          expect(wrapper.find('.list-item').exists()).toBe(true)
        })

        it('displays the edit button', () => {
          expect(wrapper.find('.base-button[data-test="edit-button"]').exists()).toBe(true)
        })

        it('displays the delete button', () => {
          expect(wrapper.find('.base-button[data-test="delete-button"]').exists()).toBe(true)
        })
      })

      describe('editing item', () => {
        beforeEach(async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
          // Wolle input = wrapper.find('input#editSocialMedia')
        })

        it('disables adding items while editing', () => {
          const submitButton = wrapper.find('.base-button[data-test="add-save-button"]')
          expect(submitButton.text()).not.toContain('settings.social-media.submit')
        })

        it('allows the user to cancel editing', async () => {
          expect(wrapper.find('.edit-item').exists()).toBeTruthy()
          const cancelButton = wrapper.find('button#cancel')
          cancelButton.trigger('click')
          await Vue.nextTick()
          expect(wrapper.find('.edit-item').exists()).not.toBeTruthy()
        })
      })

      describe('calls callback functions', () => {
        it('call edit', async () => {
          const editButton = wrapper.find('.base-button[data-test="edit-button"]')
          editButton.trigger('click')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: 'id', dummy: 'dummy' })
          expect(propsData.callbacks.edit).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.edit).toHaveBeenCalledWith(expect.any(Object), expectedItem)
        })

        it('call edit', async () => {
          form = wrapper.find('form')
          form.trigger('submit')
          await Vue.nextTick()
          form.trigger('submit')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: '' })
          expect(propsData.callbacks.edit).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.edit).toHaveBeenCalledWith(expect.any(Object), expectedItem)
        })

        it('call delete', async () => {
          const deleteButton = wrapper.find('.base-button[data-test="delete-button"]')
          deleteButton.trigger('click')
          await Vue.nextTick()
          const expectedItem = expect.objectContaining({ id: 'id', dummy: 'dummy' })
          expect(propsData.callbacks.delete).toHaveBeenCalledTimes(1)
          expect(propsData.callbacks.delete).toHaveBeenCalledWith(expect.any(Object), expectedItem)
        })
      })
    })
  })
})
